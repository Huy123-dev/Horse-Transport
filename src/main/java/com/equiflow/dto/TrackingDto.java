package com.equiflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class TrackingDto {

    private TrackingDto() {}

    /**
     * Body của POST /api/tracking. Thời gian báo cáo và người báo cáo do server tự gán (từ JWT).
     * milestone có thể bỏ trống nếu chỉ gửi vị trí.
     */
    @Schema(name = "TrackingRequest")
    public record Request(
            @NotNull(message = "Vui lòng chọn kế hoạch vận chuyển") UUID planId,
            @Size(max = 100, message = "Mốc hành trình tối đa 100 ký tự") String milestone,
            @NotNull(message = "Vui lòng nhập vĩ độ")
            @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90")
            @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90") BigDecimal latitude,
            @NotNull(message = "Vui lòng nhập kinh độ")
            @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180")
            @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180") BigDecimal longitude
    ) {}

    @Schema(name = "TrackingResponse")
    public record Response(
            UUID logId,
            UUID planId,
            String milestone,
            BigDecimal latitude,
            BigDecimal longitude,
            LocalDateTime reportedAt,
            UUID reportedBy,
            String reportedByName
    ) {}
}
