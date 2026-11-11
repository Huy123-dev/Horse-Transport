package com.equiflow.service;

import com.equiflow.dto.BlacklistDto;
import com.equiflow.entity.*;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BlacklistService {

    public static final List<String> ACTIVE_RESTRICTION_STATUSES = List.of("RESTRICTED", "PENDING_REVIEW", "REJECTED");

    private final CustomerBlacklistRepository blacklistRepository;
    private final BlacklistAppealRepository appealRepository;
    private final UserRepository userRepository;
    private final TransportRequestRepository requestRepository;
    private final InvoiceRepository invoiceRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public BlacklistService(CustomerBlacklistRepository blacklistRepository,
                            BlacklistAppealRepository appealRepository,
                            UserRepository userRepository,
                            TransportRequestRepository requestRepository,
                            InvoiceRepository invoiceRepository,
                            AuditLogService auditLogService,
                            NotificationService notificationService) {
        this.blacklistRepository = blacklistRepository;
        this.appealRepository = appealRepository;
        this.userRepository = userRepository;
        this.requestRepository = requestRepository;
        this.invoiceRepository = invoiceRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    public boolean isCustomerRestricted(UUID customerId) {
        if (customerId == null) return false;
        return blacklistRepository.existsByCustomerIdAndStatusIn(customerId, ACTIVE_RESTRICTION_STATUSES);
    }

    @Transactional
    public BlacklistDto.Response createBlacklist(UUID managerId, BlacklistDto.CreateRequest req, String ipAddress) {
        User customer = userRepository.findById(req.customerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        if (!"CUSTOMER".equals(customer.getRoleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ tài khoản khách hàng (Customer) mới có thể đưa vào Blacklist");
        }

        if (isCustomerRestricted(req.customerId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Khách hàng này hiện đã nằm trong danh sách hạn chế (Blacklist)");
        }

        if ("OTHER".equalsIgnoreCase(req.reason()) && (req.description() == null || req.description().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mô tả chi tiết khi chọn lý do khác");
        }

        CustomerBlacklist bl = new CustomerBlacklist();
        bl.setCustomerId(req.customerId());
        bl.setRestrictedById(managerId);
        bl.setRestrictedAt(LocalDateTime.now(ZoneOffset.UTC));
        bl.setReason(req.reason().trim());
        bl.setDescription(blankToNull(req.description()));
        bl.setRelatedRequestId(req.relatedRequestId());
        bl.setRelatedInvoiceId(req.relatedInvoiceId());
        bl.setAmountDue(req.amountDue());
        bl.setDueDate(req.dueDate());
        bl.setEvidenceUrl(blankToNull(req.evidenceUrl()));
        bl.setStatus("RESTRICTED");

        CustomerBlacklist saved = blacklistRepository.save(bl);

        // Audit Log
        auditLogService.record(
                managerId,
                "BLACKLIST_CUSTOMER",
                String.format("Đưa khách hàng %s (%s) vào Blacklist. Lý do: %s. Số tiền nợ: %s",
                        customer.getName(), customer.getEmail(), saved.getReason(), saved.getAmountDue()),
                ipAddress
        );

        // Notify Customer
        notificationService.sendNotification(
                customer.getUserId(),
                "SYSTEM",
                "Tài khoản của bạn đã bị đưa vào diện hạn chế (Blacklist)",
                String.format("Lý do: %s. Vui lòng kiểm tra mục Tài khoản bị hạn chế để gửi bằng chứng hoặc kiến nghị tới Logistics Manager.", saved.getReason()),
                "BLACKLIST",
                saved.getBlacklistId()
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public BlacklistDto.StatsResponse getStats() {
        long totalRestricted = blacklistRepository.countByStatusIn(ACTIVE_RESTRICTION_STATUSES);
        long unpaidRestricted = blacklistRepository.countByReasonInAndStatusIn(
                List.of("UNPAID_INVOICE", "OUTSTANDING_DEBT", "Chưa thanh toán hóa đơn", "Còn công nợ vận chuyển"),
                ACTIVE_RESTRICTION_STATUSES
        );
        long pendingReview = blacklistRepository.countByStatus("PENDING_REVIEW");
        long paymentVerified = appealRepository.countByStatus("PAYMENT_VERIFIED");
        long reactivated = blacklistRepository.countByStatus("APPROVED_FOR_REACTIVATION");
        long rejected = blacklistRepository.countByStatus("REJECTED");

        return new BlacklistDto.StatsResponse(
                totalRestricted,
                unpaidRestricted,
                pendingReview,
                paymentVerified,
                reactivated,
                rejected
        );
    }

    @Transactional(readOnly = true)
    public List<BlacklistDto.Response> getBlacklistEntries(String search, String reason, String status) {
        List<CustomerBlacklist> all = blacklistRepository.findAllOrderByCreatedAtDesc();
        Map<UUID, User> userMap = getUsersMap(all);

        return all.stream()
                .filter(b -> {
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        if (!b.getStatus().equalsIgnoreCase(status)) return false;
                    }
                    if (reason != null && !reason.isBlank() && !reason.equalsIgnoreCase("ALL")) {
                        if (!b.getReason().equalsIgnoreCase(reason)) return false;
                    }
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        User u = userMap.get(b.getCustomerId());
                        boolean nameMatch = u != null && u.getName().toLowerCase().contains(q);
                        boolean emailMatch = u != null && u.getEmail().toLowerCase().contains(q);
                        boolean idMatch = b.getCustomerId().toString().toLowerCase().contains(q);
                        if (!nameMatch && !emailMatch && !idMatch) return false;
                    }
                    return true;
                })
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BlacklistDto.Response getBlacklistById(UUID blacklistId) {
        CustomerBlacklist bl = blacklistRepository.findById(blacklistId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ Blacklist"));
        return toResponse(bl);
    }

    @Transactional(readOnly = true)
    public List<BlacklistDto.Response> getCustomerHistory(UUID customerId) {
        return blacklistRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BlacklistDto.CustomerStatusResponse getCustomerCurrentStatus(UUID customerId) {
        Optional<CustomerBlacklist> current = blacklistRepository
                .findFirstByCustomerIdAndStatusInOrderByCreatedAtDesc(customerId, ACTIVE_RESTRICTION_STATUSES);

        List<BlacklistAppeal> appeals = appealRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        int pendingCount = (int) appeals.stream().filter(a -> "PENDING".equals(a.getStatus())).count();

        return new BlacklistDto.CustomerStatusResponse(
                current.isPresent(),
                current.map(this::toResponse).orElse(null),
                appeals.stream().map(this::toAppealResponse).toList(),
                pendingCount
        );
    }

    @Transactional
    public BlacklistDto.AppealResponse submitPaymentProof(UUID customerId, BlacklistDto.PaymentProofRequest req) {
        CustomerBlacklist bl = blacklistRepository.findById(req.blacklistId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ Blacklist"));
        if (!bl.getCustomerId().equals(customerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện trên hồ sơ này");
        }
        if (!ACTIVE_RESTRICTION_STATUSES.contains(bl.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hồ sơ Blacklist này không còn ở trạng thái hạn chế");
        }

        BlacklistAppeal appeal = new BlacklistAppeal();
        appeal.setBlacklistId(bl.getBlacklistId());
        appeal.setCustomerId(customerId);
        appeal.setAppealType("PAYMENT_PROOF");
        appeal.setRelatedInvoiceId(req.relatedInvoiceId() != null ? req.relatedInvoiceId() : bl.getRelatedInvoiceId());
        appeal.setRelatedRequestId(req.relatedRequestId() != null ? req.relatedRequestId() : bl.getRelatedRequestId());
        appeal.setAmountPaid(req.amountPaid());
        appeal.setPaymentDate(req.paymentDate() != null ? req.paymentDate() : java.time.LocalDate.now());
        appeal.setPaymentMethod(blankToNull(req.paymentMethod()));
        appeal.setReferenceCode(blankToNull(req.referenceCode()));
        appeal.setDocumentUrl(req.documentUrl().trim());
        appeal.setContent(blankToNull(req.notes()));
        appeal.setStatus("PENDING");

        BlacklistAppeal saved = appealRepository.save(appeal);

        // Update blacklist status to PENDING_REVIEW
        bl.setStatus("PENDING_REVIEW");
        blacklistRepository.save(bl);

        // Audit Log
        User customer = userRepository.findById(customerId).orElse(null);
        auditLogService.record(
                customerId,
                "SUBMIT_PAYMENT_PROOF",
                String.format("Khách hàng %s đã gửi bằng chứng thanh toán số tiền: %s",
                        customer != null ? customer.getName() : customerId, saved.getAmountPaid()),
                null
        );

        // Notify Logistics Managers
        notifyManagers(
                "Khách hàng đã gửi bằng chứng thanh toán",
                String.format("Khách hàng %s đã gửi chứng từ thanh toán cho hồ sơ hạn chế #%s. Vui lòng đối chiếu và xác minh.",
                        customer != null ? customer.getName() : customerId, bl.getBlacklistId()),
                bl.getBlacklistId()
        );

        return toAppealResponse(saved);
    }

    @Transactional
    public BlacklistDto.AppealResponse submitAppeal(UUID customerId, BlacklistDto.AppealRequest req) {
        CustomerBlacklist bl = blacklistRepository.findById(req.blacklistId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ Blacklist"));
        if (!bl.getCustomerId().equals(customerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện trên hồ sơ này");
        }
        if (!ACTIVE_RESTRICTION_STATUSES.contains(bl.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hồ sơ Blacklist này không còn ở trạng thái hạn chế");
        }

        BlacklistAppeal appeal = new BlacklistAppeal();
        appeal.setBlacklistId(bl.getBlacklistId());
        appeal.setCustomerId(customerId);
        appeal.setAppealType("APPEAL");
        appeal.setRelatedInvoiceId(req.relatedInvoiceId() != null ? req.relatedInvoiceId() : bl.getRelatedInvoiceId());
        appeal.setRelatedRequestId(req.relatedRequestId() != null ? req.relatedRequestId() : bl.getRelatedRequestId());
        appeal.setContent(req.content().trim());
        appeal.setDocumentUrl(blankToNull(req.documentUrl()));
        appeal.setStatus("PENDING");

        BlacklistAppeal saved = appealRepository.save(appeal);

        // Update blacklist status to PENDING_REVIEW
        bl.setStatus("PENDING_REVIEW");
        blacklistRepository.save(bl);

        // Audit Log
        User customer = userRepository.findById(customerId).orElse(null);
        auditLogService.record(
                customerId,
                "SUBMIT_BLACKLIST_APPEAL",
                String.format("Khách hàng %s đã gửi đơn kiến nghị mở khóa tài khoản",
                        customer != null ? customer.getName() : customerId),
                null
        );

        // Notify Logistics Managers
        notifyManagers(
                "Khách hàng gửi đơn kiến nghị mở khóa",
                String.format("Khách hàng %s đã gửi đơn kiến nghị cho hồ sơ hạn chế #%s. Vui lòng xem xét giải quyết.",
                        customer != null ? customer.getName() : customerId, bl.getBlacklistId()),
                bl.getBlacklistId()
        );

        return toAppealResponse(saved);
    }

    @Transactional
    public BlacklistDto.AppealResponse verifyPayment(UUID managerId, UUID appealId, BlacklistDto.VerifyPaymentRequest req, String ipAddress) {
        BlacklistAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu xác minh"));
        if (!"PAYMENT_PROOF".equals(appeal.getAppealType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu này không phải xác minh thanh toán");
        }

        appeal.setStatus(req.verified() ? "PAYMENT_VERIFIED" : "PAYMENT_UNVERIFIED");
        appeal.setReviewerId(managerId);
        appeal.setReviewNotes(blankToNull(req.notes()));
        appeal.setReviewedAt(LocalDateTime.now(ZoneOffset.UTC));

        BlacklistAppeal saved = appealRepository.save(appeal);

        // Audit Log
        auditLogService.record(
                managerId,
                "VERIFY_PAYMENT_PROOF",
                String.format("Quản lý đã %s thanh toán cho khiếu nại #%s. Ghi chú: %s",
                        req.verified() ? "XÁC NHẬN" : "TỪ CHỐI", appealId, req.notes()),
                ipAddress
        );

        // Notify Customer
        notificationService.sendNotification(
                appeal.getCustomerId(),
                "SYSTEM",
                req.verified() ? "Thanh toán của bạn đã được xác minh thành công" : "Chứng từ thanh toán chưa được xác minh",
                String.format("Kết quả xác minh thanh toán từ Logistics Manager: %s. Ghi chú: %s",
                        req.verified() ? "Đã xác minh hoàn thành nghĩa vụ thanh toán." : "Chưa thể xác minh giao dịch.",
                        req.notes() != null ? req.notes() : "—"),
                "BLACKLIST_APPEAL",
                appeal.getAppealId()
        );

        return toAppealResponse(saved);
    }

    @Transactional
    public BlacklistDto.AppealResponse reviewAppeal(UUID managerId, UUID appealId, BlacklistDto.ReviewAppealRequest req, String ipAddress) {
        BlacklistAppeal appeal = appealRepository.findById(appealId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn kiến nghị"));

        String decision = req.decision().trim().toUpperCase(Locale.ROOT);
        String newStatus;
        if ("APPROVE".equals(decision)) {
            newStatus = "APPROVED";
        } else if ("REJECT".equals(decision)) {
            newStatus = "REJECTED";
            // Set blacklist status to REJECTED
            CustomerBlacklist bl = blacklistRepository.findById(appeal.getBlacklistId()).orElse(null);
            if (bl != null && !"APPROVED_FOR_REACTIVATION".equals(bl.getStatus())) {
                bl.setStatus("REJECTED");
                blacklistRepository.save(bl);
            }
        } else if ("REQUEST_MORE_INFO".equals(decision)) {
            newStatus = "MORE_INFO_REQUESTED";
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quyết định không hợp lệ. Chọn APPROVE, REJECT hoặc REQUEST_MORE_INFO");
        }

        appeal.setStatus(newStatus);
        appeal.setReviewerId(managerId);
        appeal.setReviewNotes(blankToNull(req.notes()));
        appeal.setReviewedAt(LocalDateTime.now(ZoneOffset.UTC));

        BlacklistAppeal saved = appealRepository.save(appeal);

        // Audit Log
        auditLogService.record(
                managerId,
                "REVIEW_BLACKLIST_APPEAL",
                String.format("Quản lý đã xử lý kiến nghị #%s: %s. Ghi chú: %s", appealId, newStatus, req.notes()),
                ipAddress
        );

        // Notify Customer
        String statusLabel = switch (newStatus) {
            case "APPROVED" -> "Đã được chấp thuận";
            case "REJECTED" -> "Bị từ chối";
            default -> "Cần bổ sung thông tin";
        };
        notificationService.sendNotification(
                appeal.getCustomerId(),
                "SYSTEM",
                "Kết quả xem xét kiến nghị mở khóa tài khoản: " + statusLabel,
                String.format("Quản lý Logistics đã phản hồi đơn kiến nghị của bạn. Ghi chú: %s", req.notes() != null ? req.notes() : "—"),
                "BLACKLIST_APPEAL",
                appeal.getAppealId()
        );

        return toAppealResponse(saved);
    }

    @Transactional
    public BlacklistDto.Response reactivateCustomer(UUID managerId, UUID blacklistId, BlacklistDto.ReactivateRequest req, String ipAddress) {
        CustomerBlacklist bl = blacklistRepository.findById(blacklistId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ Blacklist"));

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        bl.setStatus("APPROVED_FOR_REACTIVATION");
        bl.setResolvedById(managerId);
        bl.setResolvedAt(now);
        bl.setReactivatedAt(now);
        bl.setResolutionNotes(blankToNull(req != null ? req.notes() : null));

        CustomerBlacklist saved = blacklistRepository.save(bl);

        User customer = userRepository.findById(bl.getCustomerId()).orElse(null);

        // Audit Log
        auditLogService.record(
                managerId,
                "REACTIVATE_CUSTOMER",
                String.format("Phê duyệt mở khóa tài khoản cho khách hàng %s (%s). Ghi chú: %s",
                        customer != null ? customer.getName() : bl.getCustomerId(),
                        customer != null ? customer.getEmail() : "",
                        saved.getResolutionNotes()),
                ipAddress
        );

        // Notify Customer
        notificationService.sendNotification(
                bl.getCustomerId(),
                "SYSTEM",
                "Tài khoản của bạn đã được Quản lý Logistics mở khóa thành công!",
                "Mọi quyền sử dụng dịch vụ và tạo đơn vận chuyển mới của bạn trên EQUIDELI đã được khôi phục bình thường.",
                "BLACKLIST",
                saved.getBlacklistId()
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BlacklistDto.AppealResponse> getPendingAppeals() {
        return appealRepository.findByStatusInOrderByCreatedAtDesc(List.of("PENDING")).stream()
                .map(this::toAppealResponse)
                .toList();
    }

    private void notifyManagers(String title, String message, UUID relatedId) {
        List<User> managers = userRepository.findByRoleIdAndActiveTrue("LOGISTICS_MANAGER");
        for (User m : managers) {
            notificationService.sendNotification(
                    m.getUserId(),
                    "SYSTEM",
                    title,
                    message,
                    "BLACKLIST",
                    relatedId
            );
        }
    }

    private Map<UUID, User> getUsersMap(List<CustomerBlacklist> list) {
        Set<UUID> ids = new HashSet<>();
        for (CustomerBlacklist b : list) {
            ids.add(b.getCustomerId());
            if (b.getRestrictedById() != null) ids.add(b.getRestrictedById());
            if (b.getResolvedById() != null) ids.add(b.getResolvedById());
        }
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
    }

    private BlacklistDto.Response toResponse(CustomerBlacklist b) {
        User cust = userRepository.findById(b.getCustomerId()).orElse(null);
        User restrictedBy = b.getRestrictedById() != null ? userRepository.findById(b.getRestrictedById()).orElse(null) : null;
        User resolvedBy = b.getResolvedById() != null ? userRepository.findById(b.getResolvedById()).orElse(null) : null;

        List<BlacklistAppeal> appeals = appealRepository.findByBlacklistIdOrderByCreatedAtDesc(b.getBlacklistId());
        List<BlacklistDto.AppealResponse> appealResponses = appeals.stream().map(this::toAppealResponse).toList();

        // Check active trips count for customer
        long activeTrips = requestRepository.findByCustomerIdOrderByCreatedAtDesc(b.getCustomerId()).stream()
                .filter(r -> "Cho chuyen vien kiem tra".equals(r.getStatus()) || "Da phe duyet".equals(r.getStatus()))
                .count();

        return new BlacklistDto.Response(
                b.getBlacklistId(),
                b.getCustomerId(),
                cust != null ? cust.getName() : "Khách hàng",
                cust != null ? cust.getEmail() : "",
                cust != null ? cust.getPhoneNumber() : null,
                cust != null ? cust.getAvatarUrl() : null,
                b.getRestrictedById(),
                restrictedBy != null ? restrictedBy.getName() : "Quản lý",
                b.getRestrictedAt(),
                b.getReason(),
                b.getDescription(),
                b.getRelatedRequestId(),
                b.getRelatedInvoiceId(),
                b.getAmountDue(),
                b.getDueDate(),
                b.getEvidenceUrl(),
                b.getStatus(),
                b.getResolutionNotes(),
                b.getResolvedById(),
                resolvedBy != null ? resolvedBy.getName() : null,
                b.getResolvedAt(),
                b.getReactivatedAt(),
                b.getCreatedAt(),
                b.getUpdatedAt(),
                appealResponses,
                activeTrips
        );
    }

    private BlacklistDto.AppealResponse toAppealResponse(BlacklistAppeal a) {
        User cust = userRepository.findById(a.getCustomerId()).orElse(null);
        User rev = a.getReviewerId() != null ? userRepository.findById(a.getReviewerId()).orElse(null) : null;

        return new BlacklistDto.AppealResponse(
                a.getAppealId(),
                a.getBlacklistId(),
                a.getCustomerId(),
                cust != null ? cust.getName() : "Khách hàng",
                a.getAppealType(),
                a.getRelatedInvoiceId(),
                a.getRelatedRequestId(),
                a.getAmountPaid(),
                a.getPaymentDate(),
                a.getPaymentMethod(),
                a.getReferenceCode(),
                a.getDocumentUrl(),
                a.getContent(),
                a.getStatus(),
                a.getReviewerId(),
                rev != null ? rev.getName() : null,
                a.getReviewNotes(),
                a.getReviewedAt(),
                a.getCreatedAt()
        );
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
