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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;

class CompensationClaimServiceTest {

    private final CompensationClaimRepository claimRepository = mock(CompensationClaimRepository.class);
    private final TransportPlanRepository planRepository = mock(TransportPlanRepository.class);
    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final RequestAccessService requestAccess = mock(RequestAccessService.class);

    private CompensationClaimService service;

    @BeforeEach
    void setUp() {
        service = new CompensationClaimService(
                claimRepository,
                planRepository,
                deliveryRepository,
                userRepository,
                requestAccess
        );
    }

    @Test
    void submitRequiresDescriptionWhenCategoryIsOther() {
        UUID requestId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        TransportPlan plan = new TransportPlan();
        plan.setPlanId(UUID.randomUUID());
        plan.setStatus(TransportPlanService.COMPLETED);
        when(planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId)).thenReturn(List.of(plan));
        when(deliveryRepository.existsByPlanId(plan.getPlanId())).thenReturn(true);

        CompensationClaimDto.CreateRequest req = new CompensationClaimDto.CreateRequest(
                "OTHER", "MEDIUM", "   ", new BigDecimal("500.00"), "USD", null
        );

        ApiException ex = assertThrows(ApiException.class, () -> service.submit(requestId, customerId, req));
        assertEquals(BAD_REQUEST, ex.getStatus());
    }

    @Test
    void reviewRejectionRequiresDecisionNote() {
        UUID claimId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();

        CompensationClaim claim = new CompensationClaim();
        claim.setClaimId(claimId);
        claim.setStatus(CompensationClaimService.SUBMITTED);
        when(claimRepository.findById(claimId)).thenReturn(Optional.of(claim));

        CompensationClaimDto.ReviewRequest req = new CompensationClaimDto.ReviewRequest("REJECTED", "   ", null);

        ApiException ex = assertThrows(ApiException.class, () -> service.review(claimId, managerId, req));
        assertEquals(BAD_REQUEST, ex.getStatus());
    }

    @Test
    void reviewPartiallyApprovedSucceedsWithValidAmountAndNote() {
        UUID claimId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        CompensationClaim claim = new CompensationClaim();
        claim.setClaimId(claimId);
        claim.setRequestId(UUID.randomUUID());
        claim.setCustomerId(customerId);
        claim.setStatus(CompensationClaimService.SUBMITTED);
        claim.setRequestedAmount(new BigDecimal("1000.00"));
        when(claimRepository.findById(claimId)).thenReturn(Optional.of(claim));
        when(claimRepository.saveAndFlush(any(CompensationClaim.class))).thenAnswer(i -> i.getArgument(0));

        User manager = new User();
        manager.setUserId(managerId);
        manager.setName("Trần Quản Lý");
        when(userRepository.findById(managerId)).thenReturn(Optional.of(manager));

        User customer = new User();
        customer.setUserId(customerId);
        customer.setName("Lê Khách Hàng");
        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));

        CompensationClaimDto.ReviewRequest req = new CompensationClaimDto.ReviewRequest(
                "PARTIALLY_APPROVED",
                "Đồng ý bồi thường 50% chi phí chăm sóc y tế phát sinh theo hóa đơn phòng khám thú y.",
                new BigDecimal("500.00")
        );

        CompensationClaimDto.Response res = service.review(claimId, managerId, req);

        assertNotNull(res);
        assertEquals("PARTIALLY_APPROVED", res.status());
        assertEquals("Chấp thuận một phần", res.statusLabel());
        assertEquals(new BigDecimal("500.00"), res.approvedAmount());
        assertEquals("Trần Quản Lý", res.reviewedByName());
        verify(claimRepository).saveAndFlush(any(CompensationClaim.class));
    }
}
