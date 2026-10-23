package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class InvoiceDto {

    private InvoiceDto() {}

    /**
     * PATCH payment-status. status: UNPAID | PAID | REFUNDED.
     * Khi chuyển sang PAID cần có paymentMethod (gửi kèm hoặc đã lưu sẵn trên hóa đơn).
     */
    public record PaymentStatusRequest(
            @NotBlank(message = "Vui lòng nhập trạng thái thanh toán") String status,
            @Size(max = 50, message = "Phương thức thanh toán tối đa 50 ký tự") String paymentMethod
    ) {}

    /**
     * pdfUrl: với file tải lên là đường dẫn tương đối "/api/invoices/{id}/file" (cần gửi kèm JWT để tải);
     * với dữ liệu cũ là liên kết ngoài https://... giữ nguyên.
     * fileName: tên file gốc người dùng đã chọn (null nếu là liên kết ngoài).
     */
    public record Response(
            UUID invoiceId,
            UUID requestId,
            BigDecimal amount,
            String currency,
            String pdfUrl,
            String fileName,
            String paymentStatus,
            String paymentMethod,
            LocalDateTime issuedAt,
            LocalDateTime paidAt
    ) {}
}
