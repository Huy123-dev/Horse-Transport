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

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CompensationClaimService {

    private static final String SUBMITTED = "SUBMITTED";
    private static final String APPROVED = "APPROVED";
    private static final String REJECTED = "REJECTED";

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

        CompensationClaim claim = new CompensationClaim();
        claim.setRequestId(requestId);
        claim.setCustomerId(customerId);
        claim.setDescription(request.description().trim());
        claim.setRequestedAmount(request.requestedAmount());
        claim.setEvidenceUrl(blankToNull(request.evidenceUrl()));
        claim.setStatus(SUBMITTED);
        return toResponse(claimRepository.saveAndFlush(claim), null);
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

    @Transactional
    public CompensationClaimDto.Response review(UUID claimId, UUID managerId,
                                               CompensationClaimDto.ReviewRequest request) {
        CompensationClaim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu bồi thường"));
        if (!SUBMITTED.equals(claim.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu bồi thường này đã được xử lý");
        }
        String status = request.status().trim().toUpperCase();
        if (!APPROVED.equals(status) && !REJECTED.equals(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trạng thái xử lý phải là APPROVED hoặc REJECTED");
        }
        String note = blankToNull(request.decisionNote());
        if (REJECTED.equals(status) && note == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cần ghi rõ lý do từ chối yêu cầu bồi thường");
        }
        claim.setStatus(status);
        claim.setDecisionNote(note);
        claim.setReviewedBy(managerId);
        claim.setReviewedAt(LocalDateTime.now(ZoneOffset.UTC));
        claim = claimRepository.saveAndFlush(claim);

        requestAccess.notify(claim.getCustomerId(), "REQUEST_STATUS", "Cập nhật yêu cầu bồi thường",
                "Yêu cầu bồi thường đã được " + (APPROVED.equals(status) ? "chấp thuận" : "từ chối")
                        + (note == null ? "." : ": " + note),
                "compensation_claims", claim.getClaimId());
        return toResponse(claim, userRepository.findById(managerId).map(User::getName).orElse(null));
    }

    private List<CompensationClaimDto.Response> toResponses(List<CompensationClaim> claims) {
        Map<UUID, String> reviewerNames = userRepository.findAllById(claims.stream()
                        .map(CompensationClaim::getReviewedBy).filter(id -> id != null).distinct().toList())
                .stream().collect(Collectors.toMap(User::getUserId, User::getName, (first, ignored) -> first));
        return claims.stream()
                .map(claim -> toResponse(claim, reviewerNames.get(claim.getReviewedBy())))
                .toList();
    }

    private static CompensationClaimDto.Response toResponse(CompensationClaim claim, String reviewerName) {
        return new CompensationClaimDto.Response(claim.getClaimId(), claim.getRequestId(),
                claim.getDescription(), claim.getRequestedAmount(), "USD", claim.getEvidenceUrl(),
                claim.getStatus(), claim.getDecisionNote(), claim.getSubmittedAt(), claim.getReviewedAt(), reviewerName);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
