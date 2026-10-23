package com.equiflow.service;

import com.equiflow.dto.InvoiceDto;
import com.equiflow.entity.Invoice;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.InvoiceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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

    // Giá trị payment_status lưu trong DB (khớp dữ liệu mẫu)
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
    private final FileStorageService storage;

    public InvoiceService(InvoiceRepository repository, RequestAccessService access, FileStorageService storage) {
        this.repository = repository;
        this.access = access;
        this.storage = storage;
    }

    // ================= CREATE =================
    /**
     * Lập hóa đơn kèm file PDF tải lên. amount/currency để trống thì lấy theo báo giá của yêu cầu vận chuyển.
     * Chỉ lập được cho yêu cầu đã phê duyệt, mỗi yêu cầu một hóa đơn.
     */
    @Transactional
    public InvoiceDto.Response create(UUID requestId, BigDecimal amountInput, String currencyInput,
                                      String paymentMethodInput, MultipartFile file) {
        validateInput(amountInput, currencyInput, paymentMethodInput);
        TransportRequest request = access.getApprovedOrThrow(requestId);
        if (repository.existsByRequestId(request.getRequestId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu vận chuyển này đã có hóa đơn");
        }

        BigDecimal amount = amountInput != null ? amountInput : request.getEstimatedAmount();
        if (amount == null || amount.signum() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập số tiền hóa đơn (yêu cầu chưa có báo giá để lấy mặc định)");
        }
        String currency = StatusSupport.blankToNull(currencyInput) != null
                ? currencyInput.trim().toUpperCase(Locale.ROOT)
                : request.getCurrency();

        String key = storage.storePdf(file); // lưu file sau khi mọi kiểm tra đã qua, tránh để lại file mồ côi
        try {
            Invoice inv = new Invoice();
            inv.setRequestId(request.getRequestId());
            inv.setAmount(amount);
            inv.setCurrency(currency);
            inv.setPdfUrl(key);
            inv.setPaymentMethod(StatusSupport.blankToNull(paymentMethodInput));
            inv.setPaymentStatus(UNPAID);
            inv = repository.saveAndFlush(inv);

            access.notify(request.getCustomerId(), "INVOICE", "Hóa đơn mới",
                    "Hóa đơn " + amount.toPlainString() + " " + currency + " đã được lập cho yêu cầu vận chuyển của bạn.",
                    "invoices", inv.getInvoiceId());
            return toResponse(inv);
        } catch (RuntimeException e) {
            storage.delete(key);
            throw e;
        }
    }

    private static void validateInput(BigDecimal amount, String currency, String paymentMethod) {
        if (amount != null) {
            if (amount.signum() <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Số tiền phải lớn hơn 0");
            }
            if (amount.scale() > 2 || amount.precision() - amount.scale() > 10) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Số tiền tối đa 10 chữ số nguyên và 2 chữ số thập phân");
            }
        }
        String cur = StatusSupport.blankToNull(currency);
        if (cur != null && !cur.matches("^[A-Za-z]{3}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã tiền tệ phải gồm 3 chữ cái (ví dụ JPY)");
        }
        if (paymentMethod != null && paymentMethod.trim().length() > 50) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Phương thức thanh toán tối đa 50 ký tự");
        }
    }

    // ================= READ =================
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

    /** Tải/xem file PDF của hóa đơn (cùng quy tắc quyền như xem chi tiết). */
    @Transactional(readOnly = true)
    public FileStorageService.StoredFile download(UUID id, UUID currentUserId, boolean customer) {
        Invoice inv = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hóa đơn"));
        if (customer) access.assertCustomerOwns(inv.getRequestId(), currentUserId);
        if (!storage.isStoredKey(inv.getPdfUrl())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hóa đơn này là liên kết ngoài, hãy mở trực tiếp pdfUrl");
        }
        return storage.open(inv.getPdfUrl());
    }

    // ================= UPDATE PAYMENT STATUS =================
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

    // ================= helpers =================
    private InvoiceDto.Response toResponse(Invoice i) {
        boolean stored = storage.isStoredKey(i.getPdfUrl());
        String pdfUrl = stored ? "/api/invoices/" + i.getInvoiceId() + "/file" : i.getPdfUrl();
        String fileName = stored ? storage.originalName(i.getPdfUrl()) : null;
        return new InvoiceDto.Response(i.getInvoiceId(), i.getRequestId(), i.getAmount(), i.getCurrency(),
                pdfUrl, fileName, i.getPaymentStatus(), i.getPaymentMethod(), i.getIssuedAt(), i.getPaidAt());
    }
}
