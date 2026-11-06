package com.equiflow.service;

import com.equiflow.dto.InvoiceDto;
import com.equiflow.entity.Invoice;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.TransportRequestQuote;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.InvoiceRepository;
import com.equiflow.repository.TransportRequestQuoteRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock
    private InvoiceRepository repository;

    @Mock
    private RequestAccessService access;

    @Mock
    private TransportRequestQuoteRepository quoteRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    private UUID requestId;
    private UUID customerId;
    private UUID invoiceId;
    private TransportRequest request;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        invoiceId = UUID.randomUUID();

        request = new TransportRequest();
        request.setRequestId(requestId);
        request.setCustomerId(customerId);
        request.setCurrency("USD");
        request.setEstimatedAmount(new BigDecimal("1500.00"));
    }

    @Test
    void create_success_withConfirmedQuote() {
        TransportRequestQuote quote = new TransportRequestQuote();
        quote.setRequestId(requestId);
        quote.setCurrency("USD");
        quote.setTotalAmount(new BigDecimal("1500.00"));

        when(access.getApprovedOrThrow(requestId)).thenReturn(request);
        when(repository.existsByRequestId(requestId)).thenReturn(false);
        when(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)).thenReturn(Optional.of(quote));

        Invoice saved = new Invoice();
        saved.setInvoiceId(invoiceId);
        saved.setRequestId(requestId);
        saved.setAmount(new BigDecimal("1500.00"));
        saved.setCurrency("USD");
        saved.setPdfUrl("http://example.com/inv.pdf");
        saved.setPaymentStatus(InvoiceService.UNPAID);
        saved.setPaymentMethod("BANK_TRANSFER");
        when(repository.saveAndFlush(any(Invoice.class))).thenReturn(saved);

        when(access.getOrThrow(requestId)).thenReturn(request);

        User customer = new User();
        customer.setUserId(customerId);
        customer.setName("Chủ ngựa A");
        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));

        InvoiceDto.CreateRequest req = new InvoiceDto.CreateRequest(
                requestId, new BigDecimal("1500.00"), "USD", "http://example.com/inv.pdf", "BANK_TRANSFER"
        );

        InvoiceDto.Response response = invoiceService.create(req);

        assertNotNull(response);
        assertEquals(invoiceId, response.invoiceId());
        assertEquals(new BigDecimal("1500.00"), response.amount());
        assertEquals("USD", response.currency());
        assertEquals(InvoiceService.UNPAID, response.paymentStatus());
        verify(access).notify(eq(customerId), eq("INVOICE"), anyString(), anyString(), eq("invoices"), eq(invoiceId));
    }

    @Test
    void create_throwsConflict_whenInvoiceAlreadyExists() {
        when(access.getApprovedOrThrow(requestId)).thenReturn(request);
        when(repository.existsByRequestId(requestId)).thenReturn(true);

        InvoiceDto.CreateRequest req = new InvoiceDto.CreateRequest(
                requestId, new BigDecimal("1500.00"), "USD", "http://example.com/inv.pdf", "BANK_TRANSFER"
        );

        ApiException ex = assertThrows(ApiException.class, () -> invoiceService.create(req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã có hóa đơn"));
    }

    @Test
    void create_throwsBadRequest_whenCurrencyNotUSD() {
        when(access.getApprovedOrThrow(requestId)).thenReturn(request);
        when(repository.existsByRequestId(requestId)).thenReturn(false);
        when(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)).thenReturn(Optional.empty());

        InvoiceDto.CreateRequest req = new InvoiceDto.CreateRequest(
                requestId, new BigDecimal("35000000"), "VND", "http://example.com/inv.pdf", "BANK_TRANSFER"
        );

        ApiException ex = assertThrows(ApiException.class, () -> invoiceService.create(req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("USD"));
    }

    @Test
    void create_throwsConflict_whenAmountDiffersFromConfirmedQuote() {
        TransportRequestQuote quote = new TransportRequestQuote();
        quote.setRequestId(requestId);
        quote.setCurrency("USD");
        quote.setTotalAmount(new BigDecimal("1500.00"));

        when(access.getApprovedOrThrow(requestId)).thenReturn(request);
        when(repository.existsByRequestId(requestId)).thenReturn(false);
        when(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)).thenReturn(Optional.of(quote));

        InvoiceDto.CreateRequest req = new InvoiceDto.CreateRequest(
                requestId, new BigDecimal("2000.00"), "USD", "http://example.com/inv.pdf", "BANK_TRANSFER"
        );

        ApiException ex = assertThrows(ApiException.class, () -> invoiceService.create(req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("phải khớp với báo giá"));
    }

    @Test
    void updatePaymentStatus_toPaid_success() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("1500.00"));
        inv.setCurrency("USD");
        inv.setPaymentStatus(InvoiceService.UNPAID);
        inv.setPaymentMethod("BANK_TRANSFER");

        when(repository.findById(invoiceId)).thenReturn(Optional.of(inv));
        when(repository.saveAndFlush(any(Invoice.class))).thenAnswer(invoc -> invoc.getArgument(0));
        when(access.getOrThrow(requestId)).thenReturn(request);

        InvoiceDto.PaymentStatusRequest req = new InvoiceDto.PaymentStatusRequest("PAID", "BANK_TRANSFER");

        InvoiceDto.Response res = invoiceService.updatePaymentStatus(invoiceId, req);

        assertNotNull(res);
        assertEquals(InvoiceService.PAID, res.paymentStatus());
        assertNotNull(res.paidAt());
        verify(access).notify(eq(customerId), eq("INVOICE"), anyString(), anyString(), eq("invoices"), eq(invoiceId));
    }

    @Test
    void updatePaymentStatus_toPaid_throwsBadRequest_whenMethodMissing() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setPaymentStatus(InvoiceService.UNPAID);
        inv.setPaymentMethod(null);

        when(repository.findById(invoiceId)).thenReturn(Optional.of(inv));

        InvoiceDto.PaymentStatusRequest req = new InvoiceDto.PaymentStatusRequest("PAID", null);

        ApiException ex = assertThrows(ApiException.class, () -> invoiceService.updatePaymentStatus(invoiceId, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("phương thức thanh toán"));
    }

    @Test
    void updatePaymentStatus_throwsConflict_onInvalidTransition() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setPaymentStatus(InvoiceService.UNPAID);

        when(repository.findById(invoiceId)).thenReturn(Optional.of(inv));

        InvoiceDto.PaymentStatusRequest req = new InvoiceDto.PaymentStatusRequest("REFUNDED", null);

        ApiException ex = assertThrows(ApiException.class, () -> invoiceService.updatePaymentStatus(invoiceId, req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Không thể chuyển trạng thái"));
    }

    @Test
    void findById_throwsNotFound_whenNonexistent() {
        when(repository.findById(invoiceId)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> invoiceService.findById(invoiceId, customerId, true));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    void findMine_returnsCustomerInvoices() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("1500.00"));
        inv.setCurrency("USD");
        inv.setPaymentStatus(InvoiceService.UNPAID);

        when(access.requestIdsOf(customerId)).thenReturn(Set.of(requestId));
        when(repository.findByRequestIdInOrderByIssuedAtDesc(Set.of(requestId))).thenReturn(List.of(inv));
        when(access.getOrThrow(requestId)).thenReturn(request);

        List<InvoiceDto.Response> list = invoiceService.findMine(customerId, null);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(invoiceId, list.get(0).invoiceId());
    }
}
