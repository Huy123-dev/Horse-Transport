package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class BlacklistDto {

    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn khách hàng")
            UUID customerId,

            @NotBlank(message = "Vui lòng chọn lý do hạn chế")
            String reason,

            String description,
            UUID relatedRequestId,
            UUID relatedInvoiceId,
            BigDecimal amountDue,
            LocalDate dueDate,
            String evidenceUrl
    ) {}

    public record Response(
            UUID blacklistId,
            UUID customerId,
            String customerName,
            String customerEmail,
            String customerPhone,
            String customerAvatarUrl,
            UUID restrictedById,
            String restrictedByName,
            LocalDateTime restrictedAt,
            String reason,
            String description,
            UUID relatedRequestId,
            UUID relatedInvoiceId,
            BigDecimal amountDue,
            LocalDate dueDate,
            String evidenceUrl,
            String status,
            String resolutionNotes,
            UUID resolvedById,
            String resolvedByName,
            LocalDateTime resolvedAt,
            LocalDateTime reactivatedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<AppealResponse> appeals,
            Long activeTripsCount
    ) {}

    public record StatsResponse(
            long totalRestricted,
            long unpaidRestricted,
            long pendingReview,
            long paymentVerified,
            long reactivated,
            long rejected
    ) {}

    public record PaymentProofRequest(
            @NotNull(message = "Thiếu mã hồ sơ Blacklist")
            UUID blacklistId,

            UUID relatedInvoiceId,
            UUID relatedRequestId,

            @NotNull(message = "Vui lòng nhập số tiền đã thanh toán")
            BigDecimal amountPaid,

            LocalDate paymentDate,
            String paymentMethod,
            String referenceCode,

            @NotBlank(message = "Vui lòng đính kèm hình ảnh hoặc chứng từ thanh toán")
            String documentUrl,

            String notes
    ) {}

    public record AppealRequest(
            @NotNull(message = "Thiếu mã hồ sơ Blacklist")
            UUID blacklistId,

            UUID relatedInvoiceId,
            UUID relatedRequestId,

            @NotBlank(message = "Vui lòng nhập nội dung kiến nghị")
            String content,

            String documentUrl
    ) {}

    public record AppealResponse(
            UUID appealId,
            UUID blacklistId,
            UUID customerId,
            String customerName,
            String appealType,
            UUID relatedInvoiceId,
            UUID relatedRequestId,
            BigDecimal amountPaid,
            LocalDate paymentDate,
            String paymentMethod,
            String referenceCode,
            String documentUrl,
            String content,
            String status,
            UUID reviewerId,
            String reviewerName,
            String reviewNotes,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt
    ) {}

    public record VerifyPaymentRequest(
            boolean verified,
            String notes
    ) {}

    public record ReviewAppealRequest(
            @NotBlank(message = "Vui lòng chọn quyết định xử lý (APPROVE / REJECT / REQUEST_MORE_INFO)")
            String decision,
            String notes
    ) {}

    public record ReactivateRequest(
            String notes
    ) {}

    public record CustomerStatusResponse(
            boolean restricted,
            Response currentBlacklist,
            List<AppealResponse> appeals,
            int pendingAppealsCount
    ) {}
}
