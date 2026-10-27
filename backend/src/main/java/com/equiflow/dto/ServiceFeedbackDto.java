package com.equiflow.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public final class ServiceFeedbackDto {

    private ServiceFeedbackDto() {}

    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn số sao đánh giá tổng thể (1 - 5)")
            @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
            @Max(value = 5, message = "Đánh giá tối đa 5 sao")
            Integer rating,

            @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
            @Max(value = 5, message = "Đánh giá tối đa 5 sao")
            Integer transportQuality,

            @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
            @Max(value = 5, message = "Đánh giá tối đa 5 sao")
            Integer horseCare,

            @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
            @Max(value = 5, message = "Đánh giá tối đa 5 sao")
            Integer trackingUpdates,

            @Min(value = 1, message = "Đánh giá tối thiểu 1 sao")
            @Max(value = 5, message = "Đánh giá tối đa 5 sao")
            Integer punctuality,

            @Size(max = 1000, message = "Nhận xét tối đa 1000 ký tự")
            String comments,

            @Size(max = 512, message = "Đường dẫn ảnh tối đa 512 ký tự")
            String photoUrl
    ) {}

    public record Response(
            UUID feedbackId,
            UUID requestId,
            UUID customerId,
            String customerName,
            String requestCode,
            Integer rating,
            Integer transportQuality,
            Integer horseCare,
            Integer trackingUpdates,
            Integer punctuality,
            String comments,
            String photoUrl,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
