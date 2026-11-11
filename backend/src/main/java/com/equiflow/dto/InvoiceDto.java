package com.equiflow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class InvoiceDto {
    private InvoiceDto() {}

    public record CreateRequest(
            @NotNull(message = "Mã yêu cầu là bắt buộc") UUID requestId,
            @NotNull(message = "Số tiền là bắt buộc")
            @DecimalMin(value = "0.01", message = "Số tiền phải lớn hơn 0") BigDecimal amount,
            @NotBlank(message = "Đơn vị tiền tệ là bắt buộc")
            @Pattern(regexp = "^USD$", message = "Đơn vị tiền tệ hóa đơn mới phải là USD") String currency,
            @Size(max = 512, message = "Đường dẫn PDF tối đa 512 ký tự") String pdfUrl,
            @Size(max = 50, message = "Phương thức thanh toán tối đa 50 ký tự") String paymentMethod
    ) {}

    public record PaymentStatusRequest(
            @NotBlank(message = "Trạng thái thanh toán là bắt buộc") String status,
            @Size(max = 50, message = "Phương thức thanh toán tối đa 50 ký tự") String paymentMethod,
            BigDecimal paidAmount,
            LocalDateTime dueDate,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String notes
    ) {
        public PaymentStatusRequest(String status, String paymentMethod) {
            this(status, paymentMethod, null, null, null);
        }
    }

    public record MarkPaidRequest(
            @NotBlank(message = "Phương thức thanh toán là bắt buộc")
            @Size(max = 50, message = "Phương thức thanh toán tối đa 50 ký tự") String paymentMethod,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String notes
    ) {
        public MarkPaidRequest(String paymentMethod) {
            this(paymentMethod, null);
        }
    }

    public record PaymentHistoryItem(
            UUID historyId,
            String oldStatus,
            String newStatus,
            BigDecimal paidAmount,
            BigDecimal remainingAmount,
            String paymentMethod,
            String notes,
            UUID updatedBy,
            String updatedByName,
            LocalDateTime createdAt
    ) {}

    /** Thông tin chi tiết từng cá thể ngựa được vận chuyển trong hóa đơn */
    public record HorseSummary(
            UUID horseId,
            String name,
            String microchipId,
            String breed,
            String gender,
            Integer birthYear
    ) {}

    /** Thông tin hành trình, địa điểm đi/đến, ngày vận chuyển và bàn giao thực tế */
    public record TransportDetails(
            UUID requestId,
            UUID planId,
            String originName,
            String originCountry,
            String destinationName,
            String destinationCountry,
            LocalDateTime departureDate,
            LocalDateTime arrivalDate,
            LocalDateTime completedAt,
            String recipientName,
            int horseCount,
            List<HorseSummary> horses
    ) {}

    /** Từng dòng hạng mục dịch vụ hiển thị trên bảng chi tiết hóa đơn A4 */
    public record InvoiceLineItem(
            int lineNo,
            String itemCode,
            String description,
            String category,
            int quantity,
            String unit,
            BigDecimal unitPrice,
            BigDecimal amount,
            boolean includedInPackage
    ) {}

    public record Response(
            UUID invoiceId,
            UUID requestId,
            BigDecimal amount,
            BigDecimal paidAmount,
            BigDecimal remainingAmount,
            String currency,
            String pdfUrl,
            String paymentStatus,
            String paymentMethod,
            LocalDateTime issuedAt,
            LocalDateTime dueDate,
            LocalDateTime paidAt,
            LocalDateTime updatedAt,
            UUID lastUpdatedBy,
            String lastUpdatedByName,
            boolean isOverdue,
            Long daysUntilDue,
            Long daysOverdue,
            List<PaymentHistoryItem> paymentHistory,
            UUID customerId,
            String customerName,
            String invoiceNumber,
            String customerEmail,
            String customerPhone,
            String customerOrganization,
            TransportDetails transportDetails,
            List<InvoiceLineItem> lineItems,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal additionalFees,
            BigDecimal taxAmount,
            String preparedByName
    ) {
        // Backward-compatibility constructor (11 tham số) cho các unit test cũ
        public Response(
                UUID invoiceId,
                UUID requestId,
                BigDecimal amount,
                String currency,
                String pdfUrl,
                String paymentStatus,
                String paymentMethod,
                LocalDateTime issuedAt,
                LocalDateTime paidAt,
                UUID customerId,
                String customerName
        ) {
            this(
                    invoiceId,
                    requestId,
                    amount,
                    "PAID".equalsIgnoreCase(paymentStatus) || "Da thanh toan".equalsIgnoreCase(paymentStatus) ? amount : BigDecimal.ZERO,
                    "PAID".equalsIgnoreCase(paymentStatus) || "Da thanh toan".equalsIgnoreCase(paymentStatus) ? BigDecimal.ZERO : amount,
                    currency,
                    pdfUrl,
                    paymentStatus,
                    paymentMethod,
                    issuedAt,
                    issuedAt != null ? issuedAt.plusDays(14) : null,
                    paidAt,
                    paidAt != null ? paidAt : issuedAt,
                    null,
                    null,
                    false,
                    null,
                    null,
                    List.of(),
                    customerId,
                    customerName,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    amount != null ? amount : BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null
            );
        }

        // Backward-compatibility constructor (21 tham số)
        public Response(
                UUID invoiceId,
                UUID requestId,
                BigDecimal amount,
                BigDecimal paidAmount,
                BigDecimal remainingAmount,
                String currency,
                String pdfUrl,
                String paymentStatus,
                String paymentMethod,
                LocalDateTime issuedAt,
                LocalDateTime dueDate,
                LocalDateTime paidAt,
                LocalDateTime updatedAt,
                UUID lastUpdatedBy,
                String lastUpdatedByName,
                boolean isOverdue,
                Long daysUntilDue,
                Long daysOverdue,
                List<PaymentHistoryItem> paymentHistory,
                UUID customerId,
                String customerName
        ) {
            this(
                    invoiceId,
                    requestId,
                    amount,
                    paidAmount,
                    remainingAmount,
                    currency,
                    pdfUrl,
                    paymentStatus,
                    paymentMethod,
                    issuedAt,
                    dueDate,
                    paidAt,
                    updatedAt,
                    lastUpdatedBy,
                    lastUpdatedByName,
                    isOverdue,
                    daysUntilDue,
                    daysOverdue,
                    paymentHistory,
                    customerId,
                    customerName,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    amount != null ? amount : BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null
            );
        }
    }
}
