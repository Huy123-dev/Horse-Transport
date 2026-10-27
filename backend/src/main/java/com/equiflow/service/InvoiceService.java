package com.equiflow.service;

import com.equiflow.dto.InvoiceDto;
import com.equiflow.entity.Invoice;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.InvoiceRepository;
import com.equiflow.repository.TransportRequestQuoteRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class InvoiceService {

    public static final String UNPAID = "Chua thanh toan";
    public static final String PAID = "Da thanh toan";
    public static final String REFUNDED = "Da hoan tien";

    private static final Map<String, String> STATUS_ALIASES = Map.ofEntries(
            Map.entry("chua thanh toan", UNPAID), Map.entry("unpaid", UNPAID), Map.entry("pending", UNPAID),
            Map.entry("da thanh toan", PAID), Map.entry("paid", PAID),
            Map.entry("da hoan tien", REFUNDED), Map.entry("refunded", REFUNDED));
    private static final String STATUS_HINT = "UNPAID, PAID, REFUNDED";

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            UNPAID, Set.of(PAID),
            PAID, Set.of(REFUNDED),
            REFUNDED, Set.of());

    private final InvoiceRepository repository;
    private final RequestAccessService access;
    private final TransportRequestQuoteRepository quoteRepository;
    private final UserRepository userRepository;

    public InvoiceService(InvoiceRepository repository, RequestAccessService access,
                          TransportRequestQuoteRepository quoteRepository,
                          UserRepository userRepository) {
        this.repository = repository;
        this.access = access;
        this.quoteRepository = quoteRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public InvoiceDto.Response create(InvoiceDto.CreateRequest req) {
        TransportRequest request = access.getApprovedOrThrow(req.requestId());
        if (repository.existsByRequestId(request.getRequestId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu vận chuyển này đã có hóa đơn");
        }

        var confirmedQuote = quoteRepository.findTopByRequestIdOrderByVersionDesc(request.getRequestId());
        if (confirmedQuote.isPresent() && StatusSupport.blankToNull(req.currency()) != null
                && !confirmedQuote.get().getCurrency().equalsIgnoreCase(req.currency().trim())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Đơn vị tiền tệ hóa đơn phải khớp với báo giá đã xác nhận");
        }
        String currency = confirmedQuote.map(quote -> quote.getCurrency()).orElseGet(() ->
                StatusSupport.blankToNull(req.currency()) != null
                        ? req.currency().trim().toUpperCase(Locale.ROOT)
                        : request.getCurrency());
        if (!"USD".equals(currency)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Đơn vị tiền tệ duy nhất được hỗ trợ là USD; hãy nhập báo giá USD rõ ràng cho yêu cầu cũ");
        }
        if (confirmedQuote.isEmpty() && req.amount() == null && !"USD".equals(request.getCurrency())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Yêu cầu sử dụng đơn vị tiền tệ cũ; cần nhập số tiền báo giá mới bằng USD");
        }
        BigDecimal amount = confirmedQuote.map(quote -> quote.getTotalAmount())
                .orElseGet(() -> req.amount() != null ? req.amount() : request.getEstimatedAmount());
        if (confirmedQuote.isPresent() && req.amount() != null
                && req.amount().compareTo(confirmedQuote.get().getTotalAmount()) != 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Số tiền hóa đơn phải khớp với báo giá đã xác nhận");
        }
        if (amount == null || amount.signum() < 0
                || (amount.signum() == 0 && confirmedQuote.isEmpty())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập số tiền hóa đơn (yêu cầu chưa có báo giá để lấy mặc định)");
        }

        Invoice inv = new Invoice();
        inv.setRequestId(request.getRequestId());
        inv.setAmount(amount);
        inv.setCurrency(currency);
        inv.setPdfUrl(req.pdfUrl().trim());
        inv.setPaymentMethod(StatusSupport.blankToNull(req.paymentMethod()));
        inv.setPaymentStatus(UNPAID);
        inv = repository.saveAndFlush(inv);

        access.notify(request.getCustomerId(), "INVOICE", "Hóa đơn mới",
                "Hóa đơn " + amount.toPlainString() + " " + currency + " đã được lập cho yêu cầu vận chuyển của bạn.",
                "invoices", inv.getInvoiceId());
        return toResponse(inv);
    }

    /** Customer chỉ thấy hóa đơn thuộc yêu cầu của mình; nhân viên thấy tất cả. */
    @Transactional(readOnly = true)
    public List<InvoiceDto.Response> findAll(UUID currentUserId, boolean customer, String paymentStatus) {
        String st = StatusSupport.normalizeOrNull(paymentStatus, STATUS_ALIASES, STATUS_HINT);
        List<Invoice> list;
        if (customer) {
            Set<UUID> requestIds = access.requestIdsOf(currentUserId);
            list = requestIds.isEmpty() ? List.of() : repository.findByRequestIdInOrderByIssuedAtDesc(requestIds);
        } else {
            list = repository.findAllByOrderByIssuedAtDesc();
        }
        if (st != null) {
            list = list.stream().filter(i -> st.equals(i.getPaymentStatus())).toList();
        }
        return list.stream().map(this::toResponse).toList();
    }

    /** GET /api/my/invoices */
    @Transactional(readOnly = true)
    public List<InvoiceDto.Response> findMine(UUID customerId, String paymentStatus) {
        return findAll(customerId, true, paymentStatus);
    }

    @Transactional(readOnly = true)
    public InvoiceDto.Response findById(UUID id, UUID currentUserId, boolean customer) {
        Invoice inv = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hóa đơn"));
        if (customer) access.assertCustomerOwns(inv.getRequestId(), currentUserId);
        return toResponse(inv);
    }

    @Transactional(readOnly = true)
    public InvoiceDto.Response findByRequestId(UUID requestId, UUID currentUserId, boolean customer) {
        if (customer) {
            access.assertCustomerOwns(requestId, currentUserId);
        } else {
            access.getOrThrow(requestId);
        }
        Invoice inv = repository.findFirstByRequestIdOrderByIssuedAtDesc(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Yêu cầu vận chuyển này chưa có hóa đơn"));
        return toResponse(inv);
    }

    @Transactional
    public InvoiceDto.Response markPaid(UUID id, InvoiceDto.MarkPaidRequest req) {
        return updatePaymentStatus(id, new InvoiceDto.PaymentStatusRequest("PAID", req.paymentMethod()));
    }

    @Transactional
    public InvoiceDto.Response updatePaymentStatus(UUID id, InvoiceDto.PaymentStatusRequest req) {
        Invoice inv = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hóa đơn"));
        String target = StatusSupport.normalize(req.status(), STATUS_ALIASES, STATUS_HINT);
        if (target.equals(inv.getPaymentStatus())) {
            return toResponse(inv);
        }
        if (!TRANSITIONS.getOrDefault(inv.getPaymentStatus(), Set.of()).contains(target)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể chuyển trạng thái thanh toán từ '" + inv.getPaymentStatus() + "' sang '" + target + "'");
        }

        if (PAID.equals(target)) {
            String method = StatusSupport.blankToNull(req.paymentMethod());
            if (method == null) method = inv.getPaymentMethod();
            if (method == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập phương thức thanh toán");
            }
            inv.setPaymentMethod(method);
            inv.setPaidAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        inv.setPaymentStatus(target);
        inv = repository.saveAndFlush(inv);

        UUID customerId = access.getOrThrow(inv.getRequestId()).getCustomerId();
        access.notify(customerId, "INVOICE", "Cập nhật thanh toán hóa đơn",
                "Trạng thái thanh toán hóa đơn chuyển sang: " + target,
                "invoices", inv.getInvoiceId());
        return toResponse(inv);
    }

    private InvoiceDto.Response toResponse(Invoice i) {
        UUID customerId = null;
        String customerName = null;
        try {
            TransportRequest req = access.getOrThrow(i.getRequestId());
            customerId = req.getCustomerId();
            if (customerId != null) {
                customerName = userRepository.findById(customerId).map(User::getName).orElse(null);
            }
        } catch (Exception ignored) {}

        return new InvoiceDto.Response(i.getInvoiceId(), i.getRequestId(), i.getAmount(), i.getCurrency(),
                i.getPdfUrl(), i.getPaymentStatus(), i.getPaymentMethod(), i.getIssuedAt(), i.getPaidAt(), customerId, customerName);
    }
}
