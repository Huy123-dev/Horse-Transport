package com.equiflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class IncidentDto {

    private IncidentDto() {}

    /**
     * Body của POST /api/incidents. Trạng thái ban đầu luôn là "Dang xu ly".
     * latitude và longitude: gửi cùng nhau hoặc bỏ trống cả hai. sos bỏ trống = false.
     * additionalCost (nếu có) cần Logistics Manager duyệt qua PATCH /{id}/approve-cost.
     */
    @Schema(name = "IncidentRequest")
    public record Request(
            @NotNull(message = "Vui lòng chọn kế hoạch vận chuyển") UUID planId,
            @NotBlank(message = "Vui lòng nhập loại sự cố")
            @Size(max = 50, message = "Loại sự cố tối đa 50 ký tự") String category,
            @NotBlank(message = "Vui lòng nhập mô tả sự cố") String description,
            Boolean sos,
            @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90")
            @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90") BigDecimal latitude,
            @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180")
            @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180") BigDecimal longitude,
            @DecimalMin(value = "0", message = "Chi phí phát sinh không được âm")
            @Digits(integer = 10, fraction = 2, message = "Chi phí phát sinh tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal additionalCost
    ) {}

    /**
     * Body của PATCH /api/incidents/{id}: chỉ gửi trường cần đổi, trường bỏ trống giữ nguyên.
     * Đổi additionalCost sau khi đã duyệt sẽ xóa trạng thái duyệt (phải duyệt lại).
     */
    @Schema(name = "IncidentUpdateRequest")
    public record UpdateRequest(
            @Size(max = 50, message = "Loại sự cố tối đa 50 ký tự") String category,
            String description,
            Boolean sos,
            @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90")
            @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90") BigDecimal latitude,
            @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180")
            @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180") BigDecimal longitude,
            @DecimalMin(value = "0", message = "Chi phí phát sinh không được âm")
            @Digits(integer = 10, fraction = 2, message = "Chi phí phát sinh tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal additionalCost
    ) {}

    @Schema(name = "IncidentResponse")
    public record Response(
            UUID incidentId,
            UUID planId,
            String category,
            String description,
            boolean sos,
            BigDecimal latitude,
            BigDecimal longitude,
            String status,
            BigDecimal additionalCost,
            boolean costApproved,
            UUID costApprovedBy,
            String costApprovedByName,
            LocalDateTime reportedAt
    ) {}
}
