package com.equiflow.service;

import com.equiflow.dto.BlacklistDto;
import com.equiflow.entity.BlacklistAppeal;
import com.equiflow.entity.CustomerBlacklist;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BlacklistServiceTest {

    private final CustomerBlacklistRepository blacklistRepository = mock(CustomerBlacklistRepository.class);
    private final BlacklistAppealRepository appealRepository = mock(BlacklistAppealRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final TransportRequestRepository requestRepository = mock(TransportRequestRepository.class);
    private final InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final NotificationService notificationService = mock(NotificationService.class);

    private BlacklistService service;

    @BeforeEach
    void setUp() {
        service = new BlacklistService(
                blacklistRepository,
                appealRepository,
                userRepository,
                requestRepository,
                invoiceRepository,
                auditLogService,
                notificationService
        );
    }

    @Test
    void createBlacklist_Success() {
        UUID managerId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        User customer = new User();
        customer.setUserId(customerId);
        customer.setName("Nguyễn Văn A");
        customer.setEmail("customer@example.com");
        customer.setRoleId("CUSTOMER");

        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(blacklistRepository.existsByCustomerIdAndStatusIn(eq(customerId), any())).thenReturn(false);
        when(blacklistRepository.save(any(CustomerBlacklist.class))).thenAnswer(invocation -> {
            CustomerBlacklist bl = invocation.getArgument(0);
            bl.setBlacklistId(UUID.randomUUID());
            return bl;
        });

        BlacklistDto.CreateRequest req = new BlacklistDto.CreateRequest(
                customerId,
                "UNPAID_INVOICE",
                "Chưa thanh toán cước vận chuyển chuyến HN-SG",
                null,
                null,
                BigDecimal.valueOf(1500),
                LocalDate.now().plusDays(7),
                "http://example.com/evidence.jpg"
        );

        BlacklistDto.Response res = service.createBlacklist(managerId, req, "127.0.0.1");

        assertNotNull(res);
        assertEquals("RESTRICTED", res.status());
        assertEquals("UNPAID_INVOICE", res.reason());
        assertEquals(BigDecimal.valueOf(1500), res.amountDue());

        verify(auditLogService).record(eq(managerId), eq("BLACKLIST_CUSTOMER"), any(), eq("127.0.0.1"));
        verify(notificationService).sendNotification(eq(customerId), eq("SYSTEM"), any(), any(), eq("BLACKLIST"), any());
    }

    @Test
    void createBlacklist_ThrowsIfAlreadyRestricted() {
        UUID managerId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        User customer = new User();
        customer.setUserId(customerId);
        customer.setRoleId("CUSTOMER");

        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(blacklistRepository.existsByCustomerIdAndStatusIn(eq(customerId), any())).thenReturn(true);

        BlacklistDto.CreateRequest req = new BlacklistDto.CreateRequest(
                customerId, "OUTSTANDING_DEBT", null, null, null, null, null, null
        );

        ApiException ex = assertThrows(ApiException.class, () -> service.createBlacklist(managerId, req, "127.0.0.1"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void submitPaymentProof_SuccessUpdatesBlacklistToPendingReview() {
        UUID customerId = UUID.randomUUID();
        UUID blacklistId = UUID.randomUUID();

        CustomerBlacklist bl = new CustomerBlacklist();
        bl.setBlacklistId(blacklistId);
        bl.setCustomerId(customerId);
        bl.setStatus("RESTRICTED");

        when(blacklistRepository.findById(blacklistId)).thenReturn(Optional.of(bl));
        when(appealRepository.save(any(BlacklistAppeal.class))).thenAnswer(inv -> {
            BlacklistAppeal a = inv.getArgument(0);
            a.setAppealId(UUID.randomUUID());
            return a;
        });

        BlacklistDto.PaymentProofRequest req = new BlacklistDto.PaymentProofRequest(
                blacklistId,
                null,
                null,
                BigDecimal.valueOf(1500),
                LocalDate.now(),
                "Chuyển khoản Vietcombank",
                "MB99998888",
                "http://example.com/receipt.jpg",
                "Đã chuyển tiền"
        );

        BlacklistDto.AppealResponse appealRes = service.submitPaymentProof(customerId, req);

        assertNotNull(appealRes);
        assertEquals("PAYMENT_PROOF", appealRes.appealType());
        assertEquals("PENDING", appealRes.status());
        assertEquals("PENDING_REVIEW", bl.getStatus());

        verify(blacklistRepository).save(bl);
    }

    @Test
    void reactivateCustomer_UnlocksAndSetsApprovedStatus() {
        UUID managerId = UUID.randomUUID();
        UUID blacklistId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        CustomerBlacklist bl = new CustomerBlacklist();
        bl.setBlacklistId(blacklistId);
        bl.setCustomerId(customerId);
        bl.setStatus("PENDING_REVIEW");

        when(blacklistRepository.findById(blacklistId)).thenReturn(Optional.of(bl));
        when(blacklistRepository.save(any(CustomerBlacklist.class))).thenReturn(bl);

        BlacklistDto.ReactivateRequest req = new BlacklistDto.ReactivateRequest("Đã đối chiếu sao kê ngân hàng thành công.");

        BlacklistDto.Response res = service.reactivateCustomer(managerId, blacklistId, req, "127.0.0.1");

        assertNotNull(res);
        assertEquals("APPROVED_FOR_REACTIVATION", bl.getStatus());
        assertEquals(managerId, bl.getResolvedById());
        assertNotNull(bl.getReactivatedAt());

        verify(auditLogService).record(eq(managerId), eq("REACTIVATE_CUSTOMER"), any(), eq("127.0.0.1"));
        verify(notificationService).sendNotification(eq(customerId), eq("SYSTEM"), any(), any(), eq("BLACKLIST"), any());
    }
}
