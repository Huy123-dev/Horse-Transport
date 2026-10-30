package com.equiflow.service;

import com.equiflow.dto.CompensationClaimDto;
import com.equiflow.entity.CompensationClaim;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.CompensationClaimRepository;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CompensationClaimService {

    public static final String SUBMITTED = "SUBMITTED";
    public static final String UNDER_REVIEW = "UNDER_REVIEW";
    public static final String NEED_INFO = "NEED_INFO";
    public static final String APPROVED = "APPROVED";
    public static final String PARTIALLY_APPROVED = "PARTIALLY_APPROVED";
    public static final String REJECTED = "REJECTED";
    public static final String RESOLVED = "RESOLVED";
    public static final String CLOSED = "CLOSED";

    private final CompensationClaimRepository claimRepository;
    private final TransportPlanRepository planRepository;
    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final RequestAccessService requestAccess;

    public CompensationClaimService(CompensationClaimRepository claimRepository,
                                    TransportPlanRepository planRepository,
                                    DeliveryRepository deliveryRepository,
                                    UserRepository userRepository,
                                    RequestAccessService requestAccess) {
        this.claimRepository = claimRepository;
        this.planRepository = planRepository;
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.requestAccess = requestAccess;
    }

    @Transactional
    public CompensationClaimDto.Response submit(UUID requestId, UUID customerId,
                                                CompensationClaimDto.CreateRequest request) {
        requestAccess.assertCustomerOwns(requestId, customerId);

        boolean delivered = planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId).stream()
                .anyMatch(plan -> TransportPlanService.COMPLETED.equals(plan.getStatus())
                        && deliveryRepository.existsByPlanId(plan.getPlanId()));
        if (!delivered) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ có thể gửi yêu cầu bồi thường sau khi chuyến đã hoàn thành và có biên bản bàn giao");
        }

        if (claimRepository.existsByRequestIdAndStatus(requestId, SUBMITTED)) {
            throw new ApiException(HttpStatus.CONFLICT, "Đã có yêu cầu bồi thường đang chờ xử lý cho đơn này");
        }

        String category = normalizeCategory(request.category());
        String description = blankToNull(request.description());
        String evidenceUrl = blankToNull(request.evidenceUrl());

        if (("HORSE_HEALTH".equals(category) || "ASSET_DAMAGE".equals(category)) && evidenceUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Danh mục này bắt buộc phải tải lên hình ảnh/tài liệu minh chứng");
        }

        if ("OTHER".equals(category) && description == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mô tả chi tiết khi chọn lý do 'Khác'");
        }
        if (description == null) {
            description = getCategoryDefaultDescription(category);
        }

        CompensationClaim claim = new CompensationClaim();
        claim.setRequestId(requestId);
        claim.setCustomerId(customerId);
        claim.setCategory(category);
        claim.setSeverity(blankToDefault(request.severity(), "MEDIUM"));
        claim.setDescription(description);
        claim.setRequestedAmount(request.requestedAmount());
        claim.setCurrency(blankToDefault(request.currency(), "USD"));
        claim.setEvidenceUrl(evidenceUrl);
        claim.setStatus(SUBMITTED);

        claim = claimRepository.saveAndFlush(claim);
        String customerName = userRepository.findById(customerId).map(User::getName).orElse("Khách hàng");
        return toResponse(claim, customerName, null);
    }

    @Transactional(readOnly = true)
    public List<CompensationClaimDto.Response> findByRequest(UUID requestId, UUID currentUserId, boolean customer) {
        if (customer) requestAccess.assertCustomerOwns(requestId, currentUserId);
        else requestAccess.getOrThrow(requestId);
        return toResponses(claimRepository.findByRequestIdOrderBySubmittedAtDesc(requestId));
    }

    @Transactional(readOnly = true)
    public List<CompensationClaimDto.Response> findAll() {
        return toResponses(claimRepository.findAllByOrderBySubmittedAtDesc());
    }

    @Transactional(readOnly = true)
    public List<CompensationClaimDto.Response> findMyClaims(UUID customerId) {
        return toResponses(claimRepository.findByCustomerIdOrderBySubmittedAtDesc(customerId));
    }

    @Transactional
    public CompensationClaimDto.Response review(UUID claimId, UUID managerId,
                                                CompensationClaimDto.ReviewRequest request) {
        CompensationClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu bồi thường"));

        Set<String> terminalStatuses = Set.of(CLOSED, RESOLVED);
        if (terminalStatuses.contains(claim.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu bồi thường này đã được đóng hoặc giải quyết xong");
        }

        String status = request.status().trim().toUpperCase();
        String note = blankToNull(request.decisionNote());

        if ((REJECTED.equals(status) || PARTIALLY_APPROVED.equals(status) || NEED_INFO.equals(status)) && note == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cần nhập lý do / ghi chú giải trình khi từ chối, duyệt một phần hoặc yêu cầu bổ sung thông tin");
        }

        BigDecimal approvedAmount = request.approvedAmount();
        if (APPROVED.equals(status)) {
            if (approvedAmount == null) {
                approvedAmount = claim.getRequestedAmount();
            }
        } else if (PARTIALLY_APPROVED.equals(status)) {
            if (approvedAmount == null || approvedAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập số tiền bồi thường được duyệt");
            }
            if (claim.getRequestedAmount() != null && approvedAmount.compareTo(claim.getRequestedAmount()) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Số tiền bồi thường được duyệt không thể lớn hơn số tiền yêu cầu ban đầu");
            }
        } else if (REJECTED.equals(status)) {
            approvedAmount = BigDecimal.ZERO;
        }

        claim.setStatus(status);
        claim.setDecisionNote(note);
        claim.setApprovedAmount(approvedAmount);
        claim.setReviewedBy(managerId);
        claim.setReviewedAt(LocalDateTime.now(ZoneOffset.UTC));
        claim = claimRepository.saveAndFlush(claim);

        requestAccess.notify(claim.getCustomerId(), "REQUEST_STATUS", "Cập nhật xử lý bồi thường",
                "Yêu cầu bồi thường đã chuyển trạng thái sang " + getStatusLabel(status)
                        + (note == null ? "." : ": " + note),
                "compensation_claims", claim.getClaimId());

        String customerName = userRepository.findById(claim.getCustomerId()).map(User::getName).orElse("Khách hàng");
        String reviewerName = userRepository.findById(managerId).map(User::getName).orElse(null);
        return toResponse(claim, customerName, reviewerName);
    }

    private List<CompensationClaimDto.Response> toResponses(List<CompensationClaim> claims) {
        Set<UUID> userIds = claims.stream()
                .flatMap(c -> java.util.stream.Stream.of(c.getCustomerId(), c.getReviewedBy()))
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Map<UUID, String> names = userRepository.findAllById(userIds)
                .stream().collect(Collectors.toMap(User::getUserId, User::getName, (first, ignored) -> first));

        return claims.stream()
                .map(c -> toResponse(c, names.get(c.getCustomerId()), names.get(c.getReviewedBy())))
                .toList();
    }

    private static CompensationClaimDto.Response toResponse(CompensationClaim claim, String customerName, String reviewerName) {
        String reqCode = "REQ-" + claim.getRequestId().toString().substring(0, 8).toUpperCase();
        return new CompensationClaimDto.Response(
                claim.getClaimId(),
                claim.getRequestId(),
                reqCode,
                claim.getCustomerId(),
                customerName != null ? customerName : "Khách hàng",
                claim.getCategory(),
                getCategoryLabel(claim.getCategory()),
                claim.getSeverity(),
                claim.getDescription(),
                claim.getRequestedAmount(),
                claim.getApprovedAmount(),
                claim.getCurrency() != null ? claim.getCurrency() : "USD",
                claim.getEvidenceUrl(),
                claim.getStatus(),
                getStatusLabel(claim.getStatus()),
                claim.getDecisionNote(),
                claim.getSubmittedAt(),
                claim.getReviewedAt(),
                reviewerName
        );
    }

    public static String getCategoryLabel(String category) {
        if (category == null) return "Chung";
        return switch (category.toUpperCase()) {
            case "HORSE_HEALTH" -> "Sức khỏe / Chấn thương ngựa";
            case "TRANSPORT_DELAY" -> "Chậm trễ hành trình vận chuyển";
            case "ASSET_DAMAGE" -> "Hư hại trang thiết bị / Tài sản";
            case "INVOICE_DISCREPANCY" -> "Sai lệch chi phí / Hóa đơn";
            case "SERVICE_MISMATCH" -> "Dịch vụ không đúng cam kết";
            case "OTHER" -> "Lý do khác";
            default -> category;
        };
    }

    private static String getCategoryDefaultDescription(String category) {
        return switch (category.toUpperCase()) {
            case "HORSE_HEALTH" -> "Phát hiện vấn đề sức khỏe hoặc chấn thương của ngựa sau hành trình vận chuyển.";
            case "TRANSPORT_DELAY" -> "Hành trình vận chuyển bị chậm trễ nghiêm trọng so với thời gian cam kết.";
            case "ASSET_DAMAGE" -> "Trang thiết bị hoặc phụ kiện đi kèm của ngựa bị hư hại trong quá trình vận chuyển.";
            case "INVOICE_DISCREPANCY" -> "Chi phí hoặc các khoản mục thanh toán trên hóa đơn không khớp với báo giá ban đầu.";
            case "SERVICE_MISMATCH" -> "Dịch vụ cung cấp thực tế không đúng với gói dịch vụ đã thỏa thuận.";
            default -> "Yêu cầu bồi thường thiệt hại liên quan đến dịch vụ vận chuyển.";
        };
    }

    public static String getStatusLabel(String status) {
        if (status == null) return "Chưa xử lý";
        return switch (status.toUpperCase()) {
            case "SUBMITTED" -> "Đã gửi (Chờ duyệt)";
            case "UNDER_REVIEW" -> "Đang thẩm định";
            case "NEED_INFO" -> "Yêu cầu bổ sung thông tin";
            case "APPROVED" -> "Đã chấp thuận";
            case "PARTIALLY_APPROVED" -> "Chấp thuận một phần";
            case "REJECTED" -> "Đã từ chối";
            case "RESOLVED" -> "Đã giải quyết";
            case "CLOSED" -> "Đã đóng";
            default -> status;
        };
    }

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) return "OTHER";
        String cat = category.trim().toUpperCase();
        return switch (cat) {
            case "HORSE_HEALTH", "TRANSPORT_DELAY", "ASSET_DAMAGE", "INVOICE_DISCREPANCY", "SERVICE_MISMATCH", "OTHER" -> cat;
            default -> "OTHER";
        };
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static String blankToDefault(String value, String def) {
        if (value == null || value.isBlank()) return def;
        return value.trim();
    }
}
