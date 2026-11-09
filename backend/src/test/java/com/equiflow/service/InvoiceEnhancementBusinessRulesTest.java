package com.equiflow.service;

import com.equiflow.dto.InvoiceDto;
import com.equiflow.entity.Delivery;
import com.equiflow.entity.Horse;
import com.equiflow.entity.Invoice;
import com.equiflow.entity.InvoicePaymentHistory;
import com.equiflow.entity.Location;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.TransportRequestQuote;
import com.equiflow.entity.TransportRequestQuoteLine;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.InvoicePaymentHistoryRepository;
import com.equiflow.repository.InvoiceRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestQuoteLineRepository;
import com.equiflow.repository.TransportRequestQuoteRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceEnhancementBusinessRulesTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private InvoicePaymentHistoryRepository historyRepository;

    @Mock
    private RequestAccessService access;

    @Mock
    private TransportRequestQuoteRepository quoteRepository;

    @Mock
    private TransportRequestQuoteLineRepository quoteLineRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LocationRepository locationRepository;

    @Mock
    private HorseRepository horseRepository;

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private DeliveryRepository deliveryRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    private UUID requestId;
    private UUID customerId;
    private UUID managerId;
    private UUID invoiceId;
    private TransportRequest request;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        invoiceId = UUID.randomUUID();

        request = new TransportRequest();
        request.setRequestId(requestId);
        request.setCustomerId(customerId);
        request.setCurrency("USD");
        request.setEstimatedAmount(new BigDecimal("5000.00"));
    }

    @Test
    @DisplayName("Scenario 2: Tự động phát hành hóa đơn khi hoàn tất chuyến và không tạo trùng")
    void test2_and_10_ensureInvoiceForCompletedTrip_idempotent() {
        UUID planId = UUID.randomUUID();
        when(invoiceRepository.findFirstByRequestIdOrderByIssuedAtDesc(requestId)).thenReturn(Optional.empty());
        when(access.getOrThrow(requestId)).thenReturn(request);

        TransportRequestQuote quote = new TransportRequestQuote();
        quote.setTotalAmount(new BigDecimal("5200.00"));
        when(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)).thenReturn(Optional.of(quote));

        when(invoiceRepository.saveAndFlush(any(Invoice.class))).thenAnswer(i -> {
            Invoice inv = i.getArgument(0);
            inv.setInvoiceId(invoiceId);
            return inv;
        });

        Invoice created = invoiceService.ensureInvoiceForCompletedTrip(requestId, planId);

        assertNotNull(created);
        assertNotNull(created.getInvoiceNumber());
        assertTrue(created.getInvoiceNumber().startsWith("HD-"));
        assertEquals(new BigDecimal("5200.00"), created.getAmount());
        assertEquals(BigDecimal.ZERO, created.getPaidAmount());
        assertEquals("USD", created.getCurrency());
        assertEquals(InvoiceService.UNPAID, created.getPaymentStatus());
        assertNotNull(created.getDueDate());
        verify(historyRepository).saveAndFlush(any(InvoicePaymentHistory.class));
        verify(access).notify(eq(customerId), eq("INVOICE"), anyString(), anyString(), eq("invoices"), eq(invoiceId));

        // Gọi lại lần 2 -> phải trả về hóa đơn hiện có, không được tạo mới (Idempotent)
        when(invoiceRepository.findFirstByRequestIdOrderByIssuedAtDesc(requestId)).thenReturn(Optional.of(created));
        Invoice secondCall = invoiceService.ensureInvoiceForCompletedTrip(requestId, planId);
        assertSame(created, secondCall);
        verify(invoiceRepository, times(1)).saveAndFlush(any(Invoice.class));
    }

    @Test
    @DisplayName("Scenario 3: Khách hàng không thể xem hóa đơn của khách hàng khác")
    void test3_customerCannotViewOtherCustomerInvoices() {
        UUID otherCustomerId = UUID.randomUUID();
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập yêu cầu vận chuyển này"))
                .when(access).assertCustomerOwns(requestId, otherCustomerId);

        ApiException ex = assertThrows(ApiException.class, () ->
                invoiceService.findById(invoiceId, otherCustomerId, true));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("Scenario 5: Manager cập nhật Unpaid thành Partially Paid thành công với audit log")
    void test5_managerCanUpdateUnpaidToPartiallyPaid() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("5000.00"));
        inv.setPaidAmount(BigDecimal.ZERO);
        inv.setPaymentStatus(InvoiceService.UNPAID);
        inv.setCurrency("USD");
        inv.setIssuedAt(LocalDateTime.now(ZoneOffset.UTC));
        inv.setDueDate(LocalDateTime.now(ZoneOffset.UTC).plusDays(14));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));
        when(invoiceRepository.saveAndFlush(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));
        when(access.getOrThrow(requestId)).thenReturn(request);

        InvoiceDto.PaymentStatusRequest updateReq = new InvoiceDto.PaymentStatusRequest(
                "PARTIALLY_PAID", "Chuyển khoản Vietcombank", new BigDecimal("2000.00"), null, "Khách trả đợt 1"
        );

        InvoiceDto.Response res = invoiceService.updatePaymentStatus(invoiceId, updateReq, managerId);

        assertNotNull(res);
        assertEquals(InvoiceService.PARTIALLY_PAID, res.paymentStatus());
        assertEquals(new BigDecimal("2000.00"), res.paidAmount());
        assertEquals(new BigDecimal("3000.00"), res.remainingAmount());
        assertFalse(res.isOverdue());
        verify(historyRepository).saveAndFlush(argThat(h ->
                h.getOldStatus().equals(InvoiceService.UNPAID) &&
                h.getNewStatus().equals(InvoiceService.PARTIALLY_PAID) &&
                h.getPaidAmount().compareTo(new BigDecimal("2000.00")) == 0 &&
                h.getRemainingAmount().compareTo(new BigDecimal("3000.00")) == 0 &&
                h.getNotes().equals("Khách trả đợt 1")
        ));
    }

    @Test
    @DisplayName("Scenario 6: Manager cập nhật thành Paid khi đã thanh toán đầy đủ")
    void test6_managerCanUpdateToPaidWhenFullyPaid() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("5000.00"));
        inv.setPaidAmount(new BigDecimal("2000.00"));
        inv.setPaymentStatus(InvoiceService.PARTIALLY_PAID);
        inv.setCurrency("USD");
        inv.setIssuedAt(LocalDateTime.now(ZoneOffset.UTC));
        inv.setDueDate(LocalDateTime.now(ZoneOffset.UTC).plusDays(14));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));
        when(invoiceRepository.saveAndFlush(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));
        when(access.getOrThrow(requestId)).thenReturn(request);

        InvoiceDto.PaymentStatusRequest updateReq = new InvoiceDto.PaymentStatusRequest(
                "PAID", "Tiền mặt", new BigDecimal("5000.00"), null, "Hoàn tất thanh toán ngoại tuyến"
        );

        InvoiceDto.Response res = invoiceService.updatePaymentStatus(invoiceId, updateReq, managerId);

        assertNotNull(res);
        assertEquals(InvoiceService.PAID, res.paymentStatus());
        assertEquals(new BigDecimal("5000.00"), res.paidAmount());
        assertEquals(BigDecimal.ZERO, res.remainingAmount());
        assertNotNull(res.paidAt());
        assertFalse(res.isOverdue());
    }

    @Test
    @DisplayName("Scenario 7: Hóa đơn quá hạn chưa trả đủ tự động hiển thị Overdue")
    void test7_invoiceAutomaticallyEvaluatesOverdueWhenPastDueDate() {
        LocalDateTime past = LocalDateTime.now(ZoneOffset.UTC).minusDays(20);
        LocalDateTime pastDue = past.plusDays(14); // Quá hạn 6 ngày

        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("5000.00"));
        inv.setPaidAmount(new BigDecimal("1000.00"));
        inv.setPaymentStatus(InvoiceService.PARTIALLY_PAID);
        inv.setCurrency("USD");
        inv.setIssuedAt(past);
        inv.setDueDate(pastDue);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));
        when(access.getOrThrow(requestId)).thenReturn(request);

        InvoiceDto.Response res = invoiceService.findById(invoiceId, managerId, false);

        assertNotNull(res);
        assertTrue(res.isOverdue());
        assertEquals(InvoiceService.OVERDUE, res.paymentStatus());
        assertNotNull(res.daysOverdue());
        assertTrue(res.daysOverdue() >= 5);
    }

    @Test
    @DisplayName("Scenario 8: Hóa đơn đã Paid không bao giờ bị hiển thị Overdue dù quá ngày due date")
    void test8_paidInvoiceNeverEvaluatedAsOverdue() {
        LocalDateTime past = LocalDateTime.now(ZoneOffset.UTC).minusDays(30);
        LocalDateTime pastDue = past.plusDays(14);

        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("5000.00"));
        inv.setPaidAmount(new BigDecimal("5000.00"));
        inv.setPaymentStatus(InvoiceService.PAID);
        inv.setCurrency("USD");
        inv.setIssuedAt(past);
        inv.setDueDate(pastDue);
        inv.setPaidAt(past.plusDays(5));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));
        when(access.getOrThrow(requestId)).thenReturn(request);

        InvoiceDto.Response res = invoiceService.findById(invoiceId, managerId, false);

        assertNotNull(res);
        assertFalse(res.isOverdue());
        assertEquals(InvoiceService.PAID, res.paymentStatus());
        assertEquals(BigDecimal.ZERO, res.remainingAmount());
    }

    @Test
    @DisplayName("Scenario 9: Enriched A4 Invoice Response trả về đầy đủ chi tiết hành trình, ngựa và bảng dịch vụ chi tiết")
    void test9_enrichedA4InvoiceResponseWithTransportAndQuoteLines() {
        UUID originId = UUID.randomUUID();
        UUID destId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID quoteId = UUID.randomUUID();

        request.setOriginLocationId(originId);
        request.setDestinationLocationId(destId);
        request.setHorseIds(Set.of(horseId));

        User customer = new User();
        customer.setUserId(customerId);
        customer.setName("Trại Ngựa Đua Đại Nam");
        customer.setEmail("dainam@equideli.vn");
        customer.setPhoneNumber("+84 909 123 456");
        customer.setOrganizationName("Dai Nam Racing Stables");

        Location origin = new Location();
        origin.setLocationId(originId);
        origin.setName("Sân bay Quốc tế Narita (NRT)");
        origin.setCountryCode("JPN");

        Location dest = new Location();
        dest.setLocationId(destId);
        dest.setName("Trung tâm Đua ngựa Củ Chi");
        dest.setCountryCode("VNM");

        Horse horse = new Horse();
        horse.setHorseId(horseId);
        horse.setName("Thunder Strike");
        horse.setMicrochipId("981020000555123");
        horse.setBreed("Thoroughbred");
        horse.setGender("Đực");
        horse.setBirthYear(2022);

        LocalDateTime depTime = LocalDateTime.of(2026, 10, 10, 8, 0);
        LocalDateTime arrTime = LocalDateTime.of(2026, 10, 12, 16, 0);
        LocalDateTime delivTime = LocalDateTime.of(2026, 10, 12, 15, 45);

        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setRequestId(requestId);
        plan.setDepartureTime(depTime);
        plan.setArrivalTime(arrTime);
        plan.setStatus(TransportPlanService.COMPLETED);

        Delivery delivery = new Delivery();
        delivery.setPlanId(planId);
        delivery.setRecipientName("Nguyễn Văn Quản Trại");
        delivery.setDeliveredAt(delivTime);

        TransportRequestQuote quote = new TransportRequestQuote();
        quote.setQuoteId(quoteId);
        quote.setRequestId(requestId);
        quote.setTotalAmount(new BigDecimal("5000.00"));
        quote.setCurrency("USD");

        TransportRequestQuoteLine line1 = new TransportRequestQuoteLine();
        line1.setQuoteId(quoteId);
        line1.setItemCode("PKG_PREMIUM");
        line1.setItemNameSnapshot("Gói vận chuyển ngựa đua tiêu chuẩn quốc tế");
        line1.setCategorySnapshot("TRANSPORT_PACKAGE");
        line1.setUnitType("FLAT_PER_REQUEST");
        line1.setQuantity(1);
        line1.setUnitPriceUsd(new BigDecimal("3800.00"));
        line1.setLineTotalUsd(new BigDecimal("3800.00"));
        line1.setIncludedInPackage(false);
        line1.setLineOrder(1);

        TransportRequestQuoteLine line2 = new TransportRequestQuoteLine();
        line2.setQuoteId(quoteId);
        line2.setItemCode("STALL_VIP_1");
        line2.setItemNameSnapshot("Chuồng đơn giảm chấn hàng không VIP");
        line2.setCategorySnapshot("STALL_CONFIGURATION");
        line2.setUnitType("STALL_CAPACITY");
        line2.setQuantity(1);
        line2.setUnitPriceUsd(new BigDecimal("1200.00"));
        line2.setLineTotalUsd(new BigDecimal("1200.00"));
        line2.setIncludedInPackage(false);
        line2.setLineOrder(2);

        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setInvoiceNumber("HD-2026-00008");
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("5000.00"));
        inv.setPaidAmount(new BigDecimal("2000.00"));
        inv.setPaymentStatus(InvoiceService.PARTIALLY_PAID);
        inv.setPaymentMethod("Chuyển khoản ngân hàng");
        inv.setCurrency("USD");
        inv.setIssuedAt(LocalDateTime.of(2026, 10, 12, 16, 30));
        inv.setDueDate(LocalDateTime.of(2026, 10, 26, 16, 30));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));
        when(access.getOrThrow(requestId)).thenReturn(request);
        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(locationRepository.findById(originId)).thenReturn(Optional.of(origin));
        when(locationRepository.findById(destId)).thenReturn(Optional.of(dest));
        when(horseRepository.findAllById(List.of(horseId))).thenReturn(List.of(horse));
        when(planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId)).thenReturn(List.of(plan));
        when(deliveryRepository.findFirstByPlanIdOrderByDeliveredAtDesc(planId)).thenReturn(Optional.of(delivery));
        when(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)).thenReturn(Optional.of(quote));
        when(quoteLineRepository.findByQuoteIdOrderByLineOrderAsc(quoteId)).thenReturn(List.of(line1, line2));

        InvoiceDto.Response res = invoiceService.findById(invoiceId, managerId, false);

        assertNotNull(res);
        assertEquals("HD-2026-00008", res.invoiceNumber());
        assertEquals("Trại Ngựa Đua Đại Nam", res.customerName());
        assertEquals("dainam@equideli.vn", res.customerEmail());
        assertEquals("+84 909 123 456", res.customerPhone());
        assertEquals("Dai Nam Racing Stables", res.customerOrganization());

        assertNotNull(res.transportDetails());
        assertEquals("Sân bay Quốc tế Narita (NRT)", res.transportDetails().originName());
        assertEquals("Trung tâm Đua ngựa Củ Chi", res.transportDetails().destinationName());
        assertEquals(1, res.transportDetails().horseCount());
        assertEquals("Thunder Strike", res.transportDetails().horses().get(0).name());
        assertEquals("981020000555123", res.transportDetails().horses().get(0).microchipId());
        assertEquals(delivTime, res.transportDetails().completedAt());

        assertEquals(2, res.lineItems().size());
        assertEquals(new BigDecimal("5000.00"), res.subtotal());
        assertEquals(BigDecimal.ZERO, res.discountAmount());
        assertEquals(BigDecimal.ZERO, res.additionalFees());
        assertEquals(BigDecimal.ZERO, res.taxAmount());
        assertEquals(new BigDecimal("5000.00"), res.amount());
        assertEquals(new BigDecimal("2000.00"), res.paidAmount());
        assertEquals(new BigDecimal("3000.00"), res.remainingAmount());
    }

    @Test
    @DisplayName("Validation: Không cho phép số tiền đã thanh toán vượt quá tổng tiền hoặc âm")
    void test_validation_paidAmountWithinBounds() {
        Invoice inv = new Invoice();
        inv.setInvoiceId(invoiceId);
        inv.setRequestId(requestId);
        inv.setAmount(new BigDecimal("5000.00"));
        inv.setPaymentStatus(InvoiceService.UNPAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(inv));

        // Vượt quá
        InvoiceDto.PaymentStatusRequest overReq = new InvoiceDto.PaymentStatusRequest(
                "PARTIALLY_PAID", "Tiền mặt", new BigDecimal("6000.00"), null, "Lỗi"
        );
        ApiException ex1 = assertThrows(ApiException.class, () ->
                invoiceService.updatePaymentStatus(invoiceId, overReq, managerId));
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatus());
        assertTrue(ex1.getMessage().contains("vượt quá"));

        // Âm
        InvoiceDto.PaymentStatusRequest negReq = new InvoiceDto.PaymentStatusRequest(
                "PARTIALLY_PAID", "Tiền mặt", new BigDecimal("-100.00"), null, "Lỗi"
        );
        ApiException ex2 = assertThrows(ApiException.class, () ->
                invoiceService.updatePaymentStatus(invoiceId, negReq, managerId));
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatus());
        assertTrue(ex2.getMessage().contains("không được âm"));
    }
}
