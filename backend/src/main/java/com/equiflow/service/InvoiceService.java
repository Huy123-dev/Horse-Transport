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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class InvoiceService {

    public static final String UNPAID = "Chua thanh toan";
    public static final String PARTIALLY_PAID = "Thanh toan mot phan";
    public static final String PAID = "Da thanh toan";
    public static final String OVERDUE = "Qua han thanh toan";
    public static final String REFUNDED = "Da hoan tien";

    private static final String USD = "USD";
    private static final int DEFAULT_DUE_DAYS = 14;

    private static final Map<String, String> STATUS_ALIASES = Map.ofEntries(
            Map.entry("chua thanh toan", UNPAID),
            Map.entry("chưa thanh toán", UNPAID),
            Map.entry("unpaid", UNPAID),
            Map.entry("thanh toan mot phan", PARTIALLY_PAID),
            Map.entry("thanh toán một phần", PARTIALLY_PAID),
            Map.entry("da thanh toan mot phan", PARTIALLY_PAID),
            Map.entry("đã thanh toán một phần", PARTIALLY_PAID),
            Map.entry("partially_paid", PARTIALLY_PAID),
            Map.entry("partial", PARTIALLY_PAID),
            Map.entry("partially paid", PARTIALLY_PAID),
            Map.entry("da thanh toan", PAID),
            Map.entry("đã thanh toán", PAID),
            Map.entry("paid", PAID),
            Map.entry("qua han", OVERDUE),
            Map.entry("quá hạn", OVERDUE),
            Map.entry("qua han thanh toan", OVERDUE),
            Map.entry("quá hạn thanh toán", OVERDUE),
            Map.entry("overdue", OVERDUE),
            Map.entry("da hoan tien", REFUNDED),
            Map.entry("đã hoàn tiền", REFUNDED),
            Map.entry("refunded", REFUNDED)
    );
    private static final String STATUS_HINT = "UNPAID, PARTIALLY_PAID, PAID, OVERDUE, REFUNDED";

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            UNPAID, Set.of(PARTIALLY_PAID, PAID, OVERDUE),
            PARTIALLY_PAID, Set.of(PARTIALLY_PAID, PAID, UNPAID, OVERDUE),
            OVERDUE, Set.of(PARTIALLY_PAID, PAID, UNPAID),
            PAID, Set.of(REFUNDED, PARTIALLY_PAID),
            REFUNDED, Set.of()
    );

    private final InvoiceRepository repository;
    private final InvoicePaymentHistoryRepository historyRepository;
    private final RequestAccessService access;
    private final TransportRequestQuoteRepository quoteRepository;
    private final TransportRequestQuoteLineRepository quoteLineRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final HorseRepository horseRepository;
    private final TransportPlanRepository planRepository;
    private final DeliveryRepository deliveryRepository;

    public InvoiceService(InvoiceRepository repository,
                          InvoicePaymentHistoryRepository historyRepository,
                          RequestAccessService access,
                          TransportRequestQuoteRepository quoteRepository,
                          TransportRequestQuoteLineRepository quoteLineRepository,
                          UserRepository userRepository,
                          LocationRepository locationRepository,
                          HorseRepository horseRepository,
                          TransportPlanRepository planRepository,
                          DeliveryRepository deliveryRepository) {
        this.repository = repository;
        this.historyRepository = historyRepository;
        this.access = access;
        this.quoteRepository = quoteRepository;
        this.quoteLineRepository = quoteLineRepository;
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
        this.horseRepository = horseRepository;
        this.planRepository = planRepository;
        this.deliveryRepository = deliveryRepository;
    }

    @Transactional
    public InvoiceDto.Response create(InvoiceDto.CreateRequest req) {
        return create(req, null);
    }

    @Transactional
    public InvoiceDto.Response create(InvoiceDto.CreateRequest req, UUID actorUserId) {
        TransportRequest request = access.getApprovedOrThrow(req.requestId());
        if (repository.existsByRequestId(request.getRequestId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu này đã có hóa đơn");
        }
        String currency = validateInvoiceCurrencyAndAmount(request, req.currency(), req.amount());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Invoice inv = new Invoice();
        inv.setInvoiceNumber(generateNextInvoiceNumber(now));
        inv.setRequestId(request.getRequestId());
        inv.setAmount(req.amount());
        inv.setPaidAmount(BigDecimal.ZERO);
        inv.setCurrency(currency);
        String resolvedPdfUrl = blankToNull(req.pdfUrl());
        inv.setPdfUrl(resolvedPdfUrl != null ? resolvedPdfUrl : "/invoices/pending.pdf");
        inv.setPaymentStatus(UNPAID);
        inv.setPaymentMethod(blankToNull(req.paymentMethod()) != null ? req.paymentMethod().trim() : "Chuyển khoản thủ công");
        inv.setIssuedAt(now);
        inv.setDueDate(now.plusDays(DEFAULT_DUE_DAYS));
        inv.setLastUpdatedBy(actorUserId);
        inv.setUpdatedAt(now);
        inv = repository.saveAndFlush(inv);

        if (resolvedPdfUrl == null && inv.getInvoiceId() != null) {
            inv.setPdfUrl("/invoices/" + inv.getInvoiceId() + ".pdf");
            inv = repository.saveAndFlush(inv);
        }

        recordPaymentHistory(
                inv.getInvoiceId(),
                "Khởi tạo",
                UNPAID,
                BigDecimal.ZERO,
                inv.getAmount(),
                inv.getPaymentMethod(),
                "Phát hành hóa đơn mới",
                actorUserId,
                now
        );

        access.notify(request.getCustomerId(), "INVOICE", "Hóa đơn mới",
                "Một hóa đơn mới trị giá " + inv.getAmount() + " " + inv.getCurrency() + " đã được phát hành.",
                "invoices", inv.getInvoiceId());
        return toResponse(inv);
    }

    /**
     * Tự động phát hành hóa đơn khi chuyến vận chuyển hoàn tất (COMPLETED).
     * Đảm bảo tính Idempotent: nếu đơn vận chuyển đã có hóa đơn thì trả về hóa đơn hiện có, không tạo trùng.
     */
    @Transactional
    public Invoice ensureInvoiceForCompletedTrip(UUID requestId, UUID planId) {
        Optional<Invoice> existing = repository.findFirstByRequestIdOrderByIssuedAtDesc(requestId);
        if (existing.isPresent()) {
            return existing.get();
        }

        TransportRequest request = access.getOrThrow(requestId);
        BigDecimal invoiceAmount = quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)
                .map(TransportRequestQuote::getTotalAmount)
                .orElse(request.getEstimatedAmount());

        if (invoiceAmount == null || invoiceAmount.compareTo(BigDecimal.ZERO) <= 0) {
            invoiceAmount = new BigDecimal("2500.00");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Invoice inv = new Invoice();
        inv.setInvoiceNumber(generateNextInvoiceNumber(now));
        inv.setRequestId(requestId);
        inv.setAmount(invoiceAmount);
        inv.setPaidAmount(BigDecimal.ZERO);
        inv.setCurrency(USD);
        inv.setPdfUrl("/invoices/auto-" + requestId + ".pdf");
        inv.setPaymentStatus(UNPAID);
        inv.setPaymentMethod("Chuyển khoản thủ công");
        inv.setIssuedAt(now);
        inv.setDueDate(now.plusDays(DEFAULT_DUE_DAYS));
        inv.setUpdatedAt(now);
        inv = repository.saveAndFlush(inv);

        recordPaymentHistory(
                inv.getInvoiceId(),
                "Khởi tạo tự động",
                UNPAID,
                BigDecimal.ZERO,
                inv.getAmount(),
                inv.getPaymentMethod(),
                "Tự động phát hành hóa đơn khi hoàn tất chuyến vận chuyển",
                null,
                now
        );

        access.notify(
                request.getCustomerId(),
                "INVOICE",
                "Phát hành hóa đơn dịch vụ vận chuyển",
                "Chuyến vận chuyển đã hoàn tất. Hóa đơn dịch vụ trị giá " + inv.getAmount() + " "
                        + inv.getCurrency() + " đã được phát hành (Hạn thanh toán: 14 ngày).",
                "invoices",
                inv.getInvoiceId()
        );
        return inv;
    }

    @Transactional
    public void applyCompensationAdjustment(UUID requestId, String currency,
                                           BigDecimal previousDeduction, BigDecimal nextDeduction,
                                           UUID actorUserId) {
        previousDeduction = previousDeduction != null ? previousDeduction : BigDecimal.ZERO;
        nextDeduction = nextDeduction != null ? nextDeduction : BigDecimal.ZERO;
        if (previousDeduction.compareTo(nextDeduction) == 0) {
            return;
        }

        Invoice invoice = repository.findFirstByRequestIdOrderByIssuedAtDesc(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                        "Không thể duyệt bồi thường vì yêu cầu chưa có hóa đơn để khấu trừ"));
        if (currency == null || invoice.getCurrency() == null
                || !invoice.getCurrency().equalsIgnoreCase(currency.trim())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Đơn vị tiền tệ bồi thường phải khớp với đơn vị tiền tệ hóa đơn");
        }
        if (REFUNDED.equals(invoice.getPaymentStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể điều chỉnh hóa đơn đã hoàn tiền");
        }

        BigDecimal currentTotal = invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO;
        BigDecimal availableTotal = currentTotal.add(previousDeduction);
        if (nextDeduction.compareTo(availableTotal) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Số tiền bồi thường được duyệt vượt quá số tiền hóa đơn còn có thể khấu trừ");
        }

        BigDecimal adjustedTotal = availableTotal.subtract(nextDeduction);
        BigDecimal paidAmount = invoice.getPaidAmount() != null
                ? invoice.getPaidAmount()
                : (PAID.equals(invoice.getPaymentStatus()) ? currentTotal : BigDecimal.ZERO);
        if (PAID.equals(invoice.getPaymentStatus()) && paidAmount.compareTo(BigDecimal.ZERO) == 0) {
            paidAmount = currentTotal;
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String oldPaymentStatus = invoice.getPaymentStatus();
        BigDecimal remainingAmount = adjustedTotal.subtract(paidAmount).max(BigDecimal.ZERO);
        String adjustedPaymentStatus;
        if (remainingAmount.compareTo(BigDecimal.ZERO) == 0) {
            adjustedPaymentStatus = PAID;
            if (invoice.getPaidAt() == null) {
                invoice.setPaidAt(now);
            }
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            adjustedPaymentStatus = PARTIALLY_PAID;
            invoice.setPaidAt(null);
        } else if (invoice.getDueDate() != null && invoice.getDueDate().isBefore(now)) {
            adjustedPaymentStatus = OVERDUE;
            invoice.setPaidAt(null);
        } else {
            adjustedPaymentStatus = UNPAID;
            invoice.setPaidAt(null);
        }

        invoice.setAmount(adjustedTotal);
        invoice.setPaidAmount(paidAmount);
        invoice.setPaymentStatus(adjustedPaymentStatus);
        invoice.setLastUpdatedBy(actorUserId);
        invoice.setUpdatedAt(now);
        repository.saveAndFlush(invoice);

        recordPaymentHistory(
                invoice.getInvoiceId(),
                oldPaymentStatus,
                adjustedPaymentStatus,
                paidAmount,
                remainingAmount,
                invoice.getPaymentMethod(),
                "Điều chỉnh hóa đơn theo bồi thường đã duyệt: "
                        + currentTotal + " → " + adjustedTotal + " " + invoice.getCurrency(),
                actorUserId,
                now
        );

        UUID customerId = access.getOrThrow(requestId).getCustomerId();
        access.notify(customerId, "INVOICE", "Hóa đơn đã được điều chỉnh",
                "Hóa đơn " + resolveInvoiceNumber(invoice) + " đã được khấu trừ khoản bồi thường được duyệt. "
                        + "Số dư còn lại: " + remainingAmount + " " + invoice.getCurrency() + ".",
                "invoices", invoice.getInvoiceId());
    }

    private String validateInvoiceCurrencyAndAmount(TransportRequest request, String requestedCurrency, BigDecimal amount) {
        TransportRequestQuote confirmedQuote = quoteRepository.findTopByRequestIdOrderByVersionDesc(request.getRequestId())
                .orElse(null);
        String normalizedCurrency = requestedCurrency == null ? "" : requestedCurrency.trim().toUpperCase();
        if (!USD.equals(normalizedCurrency)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hóa đơn mới chỉ hỗ trợ đơn vị tiền tệ USD");
        }
        if (confirmedQuote != null) {
            if (!USD.equalsIgnoreCase(confirmedQuote.getCurrency())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Báo giá xác nhận của yêu cầu không phải USD; không tự động quy đổi dữ liệu lịch sử");
            }
            if (confirmedQuote.getTotalAmount().compareTo(amount) != 0) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Số tiền hóa đơn phải khớp với báo giá USD đã xác nhận: " + confirmedQuote.getTotalAmount());
            }
            return USD;
        }
        if (request.getCurrency() != null && !USD.equalsIgnoreCase(request.getCurrency())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Yêu cầu vận chuyển đang dùng đơn vị " + request.getCurrency()
                            + "; không tự động quy đổi dữ liệu lịch sử sang USD");
        }
        if (request.getEstimatedAmount() != null && request.getEstimatedAmount().compareTo(amount) != 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Số tiền hóa đơn phải khớp với chi phí ước tính USD của yêu cầu: " + request.getEstimatedAmount());
        }
        return USD;
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto.Response> findAll(UUID currentUserId, boolean customer, String status) {
        if (customer) {
            return findMine(currentUserId, status);
        }
        return findAll(status);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto.Response> findAll(String status) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        List<InvoiceDto.Response> all = repository.findAllByOrderByIssuedAtDesc().stream()
                .map(this::toResponse)
                .toList();
        return filterByEffectiveStatus(all, st);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto.Response> findMine(UUID customerId, String status) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        Set<UUID> requestIds = access.requestIdsOf(customerId);
        if (requestIds.isEmpty()) return List.of();
        List<InvoiceDto.Response> list = repository.findByRequestIdInOrderByIssuedAtDesc(requestIds).stream()
                .map(this::toResponse)
                .toList();
        return filterByEffectiveStatus(list, st);
    }

    private List<InvoiceDto.Response> filterByEffectiveStatus(List<InvoiceDto.Response> list, String normalizedStatus) {
        if (normalizedStatus == null) return list;
        if (OVERDUE.equals(normalizedStatus)) {
            return list.stream().filter(InvoiceDto.Response::isOverdue).toList();
        }
        return list.stream()
                .filter(r -> normalizedStatus.equals(r.paymentStatus()) || (UNPAID.equals(normalizedStatus) && r.isOverdue() && r.paidAmount().compareTo(BigDecimal.ZERO) == 0))
                .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceDto.Response findById(UUID id, UUID currentUserId, boolean customer) {
        Invoice inv = getOrThrow(id);
        if (customer) access.assertCustomerOwns(inv.getRequestId(), currentUserId);
        return toResponse(inv);
    }

    @Transactional(readOnly = true)
    public InvoiceDto.Response findByRequestId(UUID requestId, UUID currentUserId, boolean customer) {
        return findByRequest(requestId, currentUserId, customer);
    }

    @Transactional(readOnly = true)
    public InvoiceDto.Response findByRequest(UUID requestId, UUID currentUserId, boolean customer) {
        access.getOrThrow(requestId);
        if (customer) access.assertCustomerOwns(requestId, currentUserId);
        Invoice inv = repository.findFirstByRequestIdOrderByIssuedAtDesc(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Yêu cầu này chưa có hóa đơn"));
        return toResponse(inv);
    }

    @Transactional
    public InvoiceDto.Response updatePaymentStatus(UUID id, InvoiceDto.PaymentStatusRequest req) {
        return updatePaymentStatus(id, req, null);
    }

    @Transactional
    public InvoiceDto.Response updatePaymentStatus(UUID id, InvoiceDto.PaymentStatusRequest req, UUID actorUserId) {
        Invoice inv = getOrThrow(id);
        String oldStatus = inv.getPaymentStatus();
        String target = StatusSupport.normalize(req.status(), STATUS_ALIASES, STATUS_HINT);
        String method = blankToNull(req.paymentMethod());

        BigDecimal totalAmount = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
        BigDecimal currentPaid = inv.getPaidAmount() != null ? inv.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal newPaidAmount = req.paidAmount() != null ? req.paidAmount() : currentPaid;

        if (newPaidAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Số tiền đã thanh toán không được âm");
        }
        if (newPaidAmount.compareTo(totalAmount) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Số tiền đã thanh toán không được vượt quá tổng tiền hóa đơn (" + totalAmount + " USD)");
        }

        if (PAID.equals(target)) {
            if (method == null && inv.getPaymentMethod() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Cần ghi rõ phương thức thanh toán khi xác nhận đã thanh toán");
            }
            newPaidAmount = totalAmount;
        } else if (PARTIALLY_PAID.equals(target)) {
            if (req.paidAmount() == null && currentPaid.compareTo(BigDecimal.ZERO) == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập số tiền khách hàng đã thanh toán một phần");
            }
            if (newPaidAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Số tiền thanh toán một phần phải lớn hơn 0");
            }
            if (newPaidAmount.compareTo(totalAmount) == 0) {
                target = PAID;
            }
        } else if (UNPAID.equals(target)) {
            newPaidAmount = BigDecimal.ZERO;
        } else if (REFUNDED.equals(target)) {
            if (!TRANSITIONS.getOrDefault(oldStatus, Set.of()).contains(REFUNDED)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Không thể chuyển trạng thái thanh toán từ '" + oldStatus + "' sang '" + target + "'");
            }
        }

        if (!target.equals(oldStatus) && !TRANSITIONS.getOrDefault(oldStatus, Set.of(PARTIALLY_PAID, PAID, UNPAID, OVERDUE)).contains(target)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể chuyển trạng thái thanh toán từ '" + oldStatus + "' sang '" + target + "'");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        inv.setPaymentStatus(target);
        inv.setPaidAmount(newPaidAmount);
        if (method != null) {
            inv.setPaymentMethod(method);
        }
        if (req.dueDate() != null) {
            inv.setDueDate(req.dueDate());
        }
        if (PAID.equals(target)) {
            inv.setPaidAt(now);
        } else if (UNPAID.equals(target) || PARTIALLY_PAID.equals(target)) {
            inv.setPaidAt(null);
        }
        inv.setLastUpdatedBy(actorUserId);
        inv.setUpdatedAt(now);
        inv = repository.saveAndFlush(inv);

        BigDecimal remaining = totalAmount.subtract(newPaidAmount);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            remaining = BigDecimal.ZERO;
        }
        recordPaymentHistory(
                inv.getInvoiceId(),
                oldStatus,
                target,
                newPaidAmount,
                remaining,
                inv.getPaymentMethod(),
                blankToNull(req.notes()) != null ? req.notes().trim() : "Cập nhật trạng thái thanh toán ngoại tuyến",
                actorUserId,
                now
        );

        UUID customerId = access.getOrThrow(inv.getRequestId()).getCustomerId();
        access.notify(customerId, "INVOICE", "Cập nhật trạng thái hóa đơn",
                "Hóa đơn " + resolveInvoiceNumber(inv) + " đã được cập nhật trạng thái: " + toVietnameseLabel(target)
                        + " (Đã trả: " + newPaidAmount + " " + inv.getCurrency() + ").",
                "invoices", inv.getInvoiceId());
        return toResponse(inv);
    }

    @Transactional
    public InvoiceDto.Response markPaid(UUID id, InvoiceDto.MarkPaidRequest req) {
        return markPaid(id, req, null);
    }

    @Transactional
    public InvoiceDto.Response markPaid(UUID id, InvoiceDto.MarkPaidRequest req, UUID actorUserId) {
        Invoice inv = getOrThrow(id);
        return updatePaymentStatus(id, new InvoiceDto.PaymentStatusRequest(
                PAID,
                req.paymentMethod(),
                inv.getAmount(),
                null,
                req.notes() != null ? req.notes() : "Xác nhận đã nhận đủ thanh toán ngoại tuyến"
        ), actorUserId);
    }

    private void recordPaymentHistory(UUID invoiceId, String oldStatus, String newStatus,
                                      BigDecimal paidAmount, BigDecimal remainingAmount,
                                      String paymentMethod, String notes, UUID updatedBy, LocalDateTime createdAt) {
        if (historyRepository == null || invoiceId == null) return;
        InvoicePaymentHistory history = new InvoicePaymentHistory();
        history.setInvoiceId(invoiceId);
        history.setOldStatus(oldStatus != null ? oldStatus : UNPAID);
        history.setNewStatus(newStatus != null ? newStatus : UNPAID);
        history.setPaidAmount(paidAmount != null ? paidAmount : BigDecimal.ZERO);
        history.setRemainingAmount(remainingAmount != null ? remainingAmount : BigDecimal.ZERO);
        history.setPaymentMethod(paymentMethod);
        history.setNotes(notes);
        history.setUpdatedBy(updatedBy);
        history.setCreatedAt(createdAt != null ? createdAt : LocalDateTime.now(ZoneOffset.UTC));
        historyRepository.saveAndFlush(history);
    }

    private Invoice getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hóa đơn"));
    }

    private String generateNextInvoiceNumber(LocalDateTime issuedAt) {
        int year = (issuedAt != null ? issuedAt : LocalDateTime.now(ZoneOffset.UTC)).getYear();
        long count = 0;
        try {
            if (repository != null) {
                count = repository.count();
            }
        } catch (Exception ignored) {
        }
        return String.format("HD-%d-%05d", year, count + 1);
    }

    private String resolveInvoiceNumber(Invoice inv) {
        if (inv.getInvoiceNumber() != null && !inv.getInvoiceNumber().isBlank()) {
            return inv.getInvoiceNumber().trim();
        }
        int year = (inv.getIssuedAt() != null ? inv.getIssuedAt() : LocalDateTime.now(ZoneOffset.UTC)).getYear();
        if (inv.getInvoiceId() != null) {
            String hex = inv.getInvoiceId().toString().replace("-", "").toUpperCase();
            int numericHash = Math.abs(hex.hashCode()) % 90000 + 10000;
            return String.format("HD-%d-%05d", year, numericHash);
        }
        return String.format("HD-%d-00001", year);
    }

    private InvoiceDto.Response toResponse(Invoice inv) {
        UUID customerId = null;
        String customerName = null;
        String customerEmail = null;
        String customerPhone = null;
        String customerOrganization = null;
        TransportRequest req = null;
        try {
            req = access.getOrThrow(inv.getRequestId());
            if (req != null) {
                customerId = req.getCustomerId();
                if (customerId != null && userRepository != null) {
                    User customer = userRepository.findById(customerId).orElse(null);
                    if (customer != null) {
                        customerName = customer.getName();
                        customerEmail = customer.getEmail();
                        customerPhone = customer.getPhoneNumber();
                        customerOrganization = customer.getOrganizationName();
                    }
                }
            }
        } catch (Exception ignored) {
        }

        BigDecimal totalAmount = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
        BigDecimal paidAmount = inv.getPaidAmount() != null ? inv.getPaidAmount() :
                (PAID.equals(inv.getPaymentStatus()) ? totalAmount : BigDecimal.ZERO);
        if (PAID.equals(inv.getPaymentStatus()) && paidAmount.compareTo(BigDecimal.ZERO) == 0) {
            paidAmount = totalAmount;
        }
        BigDecimal remainingAmount = totalAmount.subtract(paidAmount);
        if (remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            remainingAmount = BigDecimal.ZERO;
        }

        LocalDateTime issuedAt = inv.getIssuedAt() != null ? inv.getIssuedAt() : LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime dueDate = inv.getDueDate() != null ? inv.getDueDate() : issuedAt.plusDays(DEFAULT_DUE_DAYS);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate dueLocalDate = dueDate.toLocalDate();
        boolean isPaidOrRefunded = PAID.equals(inv.getPaymentStatus()) || REFUNDED.equals(inv.getPaymentStatus());
        boolean isOverdue = !isPaidOrRefunded && remainingAmount.compareTo(BigDecimal.ZERO) > 0 && dueLocalDate.isBefore(today);

        Long daysUntilDue = null;
        Long daysOverdue = null;
        if (!isPaidOrRefunded && remainingAmount.compareTo(BigDecimal.ZERO) > 0) {
            long diff = ChronoUnit.DAYS.between(today, dueLocalDate);
            if (diff < 0) {
                daysOverdue = Math.abs(diff);
            } else {
                daysUntilDue = diff;
            }
        }

        String effectiveStatus = isOverdue ? OVERDUE : inv.getPaymentStatus();

        String lastUpdatedByName = null;
        if (inv.getLastUpdatedBy() != null && userRepository != null) {
            lastUpdatedByName = userRepository.findById(inv.getLastUpdatedBy()).map(User::getName).orElse(null);
        }

        List<InvoiceDto.PaymentHistoryItem> historyItems = List.of();
        if (historyRepository != null && inv.getInvoiceId() != null) {
            try {
                historyItems = historyRepository.findByInvoiceIdOrderByCreatedAtDesc(inv.getInvoiceId()).stream()
                        .map(h -> {
                            String actorName = "Hệ thống";
                            if (h.getUpdatedBy() != null && userRepository != null) {
                                actorName = userRepository.findById(h.getUpdatedBy()).map(User::getName).orElse("Quản lý Logistics");
                            }
                            return new InvoiceDto.PaymentHistoryItem(
                                    h.getHistoryId(),
                                    h.getOldStatus(),
                                    h.getNewStatus(),
                                    h.getPaidAmount(),
                                    h.getRemainingAmount(),
                                    h.getPaymentMethod(),
                                    h.getNotes(),
                                    h.getUpdatedBy(),
                                    actorName,
                                    h.getCreatedAt()
                            );
                        })
                        .toList();
            } catch (Exception ignored) {
            }
        }

        String invoiceNumber = resolveInvoiceNumber(inv);
        InvoiceDto.TransportDetails transportDetails = buildTransportDetails(inv.getRequestId(), req);
        List<InvoiceDto.InvoiceLineItem> lineItems = buildLineItems(inv.getRequestId(), totalAmount, transportDetails);

        BigDecimal linesSum = lineItems.stream()
                .map(InvoiceDto.InvoiceLineItem::amount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal subtotal = linesSum.compareTo(BigDecimal.ZERO) > 0 ? linesSum : totalAmount;
        BigDecimal discountAmount = subtotal.compareTo(totalAmount) > 0 ? subtotal.subtract(totalAmount) : BigDecimal.ZERO;
        BigDecimal additionalFees = totalAmount.compareTo(subtotal) > 0 ? totalAmount.subtract(subtotal) : BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;

        String preparedByName = lastUpdatedByName;
        if (preparedByName == null && req != null && req.getApprovedBy() != null && userRepository != null) {
            try {
                preparedByName = userRepository.findById(req.getApprovedBy()).map(User::getName).orElse(null);
            } catch (Exception ignored) {
            }
        }
        if (preparedByName == null) {
            preparedByName = "Ban Quản lý Logistics EQUIDELI";
        }

        return new InvoiceDto.Response(
                inv.getInvoiceId(),
                inv.getRequestId(),
                totalAmount,
                paidAmount,
                remainingAmount,
                inv.getCurrency(),
                inv.getPdfUrl(),
                effectiveStatus,
                inv.getPaymentMethod(),
                issuedAt,
                dueDate,
                inv.getPaidAt(),
                inv.getUpdatedAt() != null ? inv.getUpdatedAt() : issuedAt,
                inv.getLastUpdatedBy(),
                lastUpdatedByName,
                isOverdue,
                daysUntilDue,
                daysOverdue,
                historyItems,
                customerId,
                customerName,
                invoiceNumber,
                customerEmail,
                customerPhone,
                customerOrganization,
                transportDetails,
                lineItems,
                subtotal,
                discountAmount,
                additionalFees,
                taxAmount,
                preparedByName
        );
    }

    private InvoiceDto.TransportDetails buildTransportDetails(UUID requestId, TransportRequest req) {
        String originName = null;
        String originCountry = null;
        String destinationName = null;
        String destinationCountry = null;
        LocalDateTime departureDate = null;
        LocalDateTime arrivalDate = null;
        LocalDateTime completedAt = null;
        String recipientName = null;
        UUID planId = null;
        List<InvoiceDto.HorseSummary> horses = List.of();

        try {
            if (req != null && locationRepository != null) {
                if (req.getOriginLocationId() != null) {
                    Location origin = locationRepository.findById(req.getOriginLocationId()).orElse(null);
                    if (origin != null) {
                        originName = origin.getName();
                        originCountry = origin.getCountryCode();
                    }
                }
                if (req.getDestinationLocationId() != null) {
                    Location dest = locationRepository.findById(req.getDestinationLocationId()).orElse(null);
                    if (dest != null) {
                        destinationName = dest.getName();
                        destinationCountry = dest.getCountryCode();
                    }
                }
            }

            if (req != null && req.getHorseIds() != null && !req.getHorseIds().isEmpty() && horseRepository != null) {
                List<UUID> horseIds = List.copyOf(req.getHorseIds());
                Map<UUID, Horse> horseMap = horseRepository.findAllById(horseIds).stream()
                        .collect(Collectors.toMap(Horse::getHorseId, Function.identity(), (a, b) -> a));
                horses = horseIds.stream()
                        .map(horseMap::get)
                        .filter(Objects::nonNull)
                        .map(h -> new InvoiceDto.HorseSummary(
                                h.getHorseId(),
                                h.getName(),
                                h.getMicrochipId(),
                                h.getBreed(),
                                h.getGender(),
                                h.getBirthYear()
                        ))
                        .toList();
            }

            if (requestId != null && planRepository != null) {
                List<TransportPlan> plans = planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId);
                TransportPlan activePlan = plans.stream()
                        .filter(p -> !TransportPlanService.CANCELLED.equalsIgnoreCase(p.getStatus()))
                        .findFirst()
                        .orElse(plans.isEmpty() ? null : plans.get(0));
                if (activePlan != null) {
                    planId = activePlan.getPlanId();
                    departureDate = activePlan.getDepartureTime();
                    arrivalDate = activePlan.getArrivalTime();
                    if (deliveryRepository != null && planId != null) {
                        Delivery delivery = deliveryRepository.findFirstByPlanIdOrderByDeliveredAtDesc(planId).orElse(null);
                        if (delivery != null) {
                            completedAt = delivery.getDeliveredAt();
                            recipientName = delivery.getRecipientName();
                        }
                    }
                    if (completedAt == null && TransportPlanService.COMPLETED.equalsIgnoreCase(activePlan.getStatus())) {
                        completedAt = activePlan.getArrivalTime();
                    }
                }
            }

            if (departureDate == null && req != null && req.getScheduledDepartureDate() != null) {
                departureDate = req.getScheduledDepartureDate().atStartOfDay();
            }
            if (arrivalDate == null && req != null && req.getScheduledArrivalDate() != null) {
                arrivalDate = req.getScheduledArrivalDate().atStartOfDay();
            }
        } catch (Exception ignored) {
        }

        int horseCount = !horses.isEmpty() ? horses.size()
                : (req != null && req.getHorseIds() != null ? req.getHorseIds().size() : 0);

        return new InvoiceDto.TransportDetails(
                requestId,
                planId,
                originName,
                originCountry,
                destinationName,
                destinationCountry,
                departureDate,
                arrivalDate,
                completedAt,
                recipientName,
                horseCount,
                horses
        );
    }

    private List<InvoiceDto.InvoiceLineItem> buildLineItems(
            UUID requestId,
            BigDecimal totalAmount,
            InvoiceDto.TransportDetails transportDetails
    ) {
        List<InvoiceDto.InvoiceLineItem> items = new ArrayList<>();
        try {
            if (requestId != null && quoteRepository != null && quoteLineRepository != null) {
                TransportRequestQuote quote = quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId).orElse(null);
                if (quote != null && quote.getQuoteId() != null) {
                    List<TransportRequestQuoteLine> lines = quoteLineRepository.findByQuoteIdOrderByLineOrderAsc(quote.getQuoteId());
                    int index = 1;
                    for (TransportRequestQuoteLine line : lines) {
                        items.add(new InvoiceDto.InvoiceLineItem(
                                index++,
                                line.getItemCode(),
                                formatServiceDescription(line),
                                formatCategoryLabel(line.getCategorySnapshot()),
                                line.getQuantity(),
                                formatUnitLabel(line.getUnitType()),
                                line.getUnitPriceUsd() != null ? line.getUnitPriceUsd() : BigDecimal.ZERO,
                                line.getLineTotalUsd() != null ? line.getLineTotalUsd() : BigDecimal.ZERO,
                                line.isIncludedInPackage()
                        ));
                    }
                }
            }
        } catch (Exception ignored) {
        }

        if (items.isEmpty()) {
            StringBuilder desc = new StringBuilder("Dịch vụ vận chuyển ngựa đua chuyên dụng xuyên biên giới");
            if (transportDetails != null && transportDetails.originName() != null && transportDetails.destinationName() != null) {
                desc.append(" (").append(transportDetails.originName())
                        .append(" → ").append(transportDetails.destinationName()).append(")");
            }
            if (transportDetails != null && transportDetails.horseCount() > 0) {
                desc.append(" — ").append(transportDetails.horseCount()).append(" cá thể ngựa");
            }
            BigDecimal safeAmount = totalAmount != null ? totalAmount : BigDecimal.ZERO;
            items.add(new InvoiceDto.InvoiceLineItem(
                    1,
                    "INTERNATIONAL_HORSE_TRANSPORT",
                    desc.toString(),
                    "Dịch vụ vận chuyển trọn gói",
                    1,
                    "Chuyến",
                    safeAmount,
                    safeAmount,
                    false
            ));
        }

        return items;
    }

    private String formatServiceDescription(TransportRequestQuoteLine line) {
        String name = line.getItemNameSnapshot() != null ? line.getItemNameSnapshot().trim() : "Dịch vụ vận chuyển ngựa";
        String benefits = line.getBenefitsSnapshot() != null ? line.getBenefitsSnapshot().trim() : "";
        if (!benefits.isEmpty() && !name.contains(benefits)) {
            return name + " — " + benefits;
        }
        return name;
    }

    private String formatCategoryLabel(String category) {
        if (category == null || category.isBlank()) return "Dịch vụ vận tải";
        return switch (category.trim().toUpperCase()) {
            case "TRANSPORT_PACKAGE" -> "Gói vận chuyển chính";
            case "STALL_CONFIGURATION" -> "Cấu hình chuồng chuyên dụng";
            case "VETERINARY_QUARANTINE" -> "Kiểm dịch & chăm sóc thú y";
            case "ADDITIONAL_SERVICE" -> "Dịch vụ bổ trợ hành trình";
            default -> category;
        };
    }

    private String formatUnitLabel(String unitType) {
        if (unitType == null || unitType.isBlank()) return "Đơn vị";
        return switch (unitType.trim().toUpperCase()) {
            case "FLAT_PER_REQUEST" -> "Chuyến";
            case "PER_HORSE" -> "Ngựa";
            case "STALL_CAPACITY" -> "Chuồng";
            default -> unitType;
        };
    }

    private String toVietnameseLabel(String status) {
        if (PAID.equals(status)) return "Đã thanh toán";
        if (PARTIALLY_PAID.equals(status)) return "Thanh toán một phần";
        if (OVERDUE.equals(status)) return "Quá hạn thanh toán";
        if (REFUNDED.equals(status)) return "Đã hoàn tiền";
        return "Chưa thanh toán";
    }
}
