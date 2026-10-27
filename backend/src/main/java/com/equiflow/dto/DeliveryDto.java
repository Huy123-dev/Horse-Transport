package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public final class DeliveryDto {

    private DeliveryDto() {}

    /** POST. deliveredAt bỏ trống = thời điểm hiện tại (UTC); không được ở tương lai. */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn kế hoạch vận chuyển") UUID planId,
            @NotBlank(message = "Vui lòng nhập tên người nhận")
            @Size(max = 150, message = "Tên người nhận tối đa 150 ký tự") String recipientName,
            @NotBlank(message = "Vui lòng nhập đường dẫn ảnh chữ ký")
            @Size(max = 512, message = "Đường dẫn ảnh chữ ký tối đa 512 ký tự") String signatureImageUrl,
            @Size(max = 512, message = "Đường dẫn chứng từ POD tối đa 512 ký tự") String podDocumentUrl,
            LocalDateTime deliveredAt
    ) {}

    public record Response(
            UUID deliveryId,
            UUID planId,
            String recipientName,
            String signatureImageUrl,
            LocalDateTime deliveredAt,
            String podDocumentUrl
    ) {}
}
