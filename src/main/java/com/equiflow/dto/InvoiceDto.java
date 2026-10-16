package com.equiflow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class InvoiceDto {

    private InvoiceDto() {}

    /**
     * POST. amount/currency để trống thì lấy theo báo giá (estimatedAmount/currency) của yêu cầu vận chuyển.
     * Chỉ lập được hóa đơn cho yêu cầu đã phê duyệt, mỗi yêu cầu một hóa đơn.
     */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn yêu cầu vận chuyển") UUID requestId,
            @DecimalMin(value = "0.00", inclusive = false, message = "Số tiền phải lớn hơn 0")
            @Digits(integer = 10, fraction = 2, message = "Số tiền tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal amount,
            @Pattern(regexp = "^[A-Za-z]{3}$", message = "Mã tiền tệ phải gồm 3 chữ cái (ví dụ JPY)")
            String currency,
            @NotBlank(message = "Vui lòng nhập đường dẫn file PDF hóa đơn")
            @Size(max = 512, message = "Đường dẫn PDF tối đa 512 ký tự")
            String pdfUrl,
            @Size(max = 50, message = "Phương thức thanh toán tối đa 50 ký tự")
            String paymentMethod
    ) {}

    /**
     * PATCH payment-status. status: UNPAID | PAID | REFUNDED.
     * Khi chuyển sang PAID cần có paymentMethod (gửi kèm hoặc đã lưu sẵn trên hóa đơn).
     */
    public record PaymentStatusRequest(
            @NotBlank(message = "Vui lòng nhập trạng thái thanh toán") String status,
            @Size(max = 50, message = "Phương thức thanh toán tối đa 50 ký tự") String paymentMethod
    ) {}

    public record Response(
            UUID invoiceId,
            UUID requestId,
            BigDecimal amount,
            String currency,
            String pdfUrl,
            String paymentStatus,
            String paymentMethod,
            LocalDateTime issuedAt,
            LocalDateTime paidAt
    ) {}
}
