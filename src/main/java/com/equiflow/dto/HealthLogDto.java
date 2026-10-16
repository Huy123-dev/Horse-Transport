package com.equiflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class HealthLogDto {

    private HealthLogDto() {}

    /**
     * Body của POST /api/health-logs. Thời điểm ghi và người ghi do server gán (từ JWT).
     * Phải nhập ít nhất một chỉ số hoặc ghi chú/ảnh bên cạnh planId và horseId.
     */
    @Schema(name = "HealthLogRequest")
    public record Request(
            @NotNull(message = "Vui lòng chọn kế hoạch vận chuyển") UUID planId,
            @NotNull(message = "Vui lòng chọn ngựa") UUID horseId,
            @Min(value = 1, message = "Mức độ căng thẳng phải từ 1 đến 10")
            @Max(value = 10, message = "Mức độ căng thẳng phải từ 1 đến 10") Integer stressLevel,
            @Min(value = 10, message = "Nhịp tim phải từ 10 đến 250 lần/phút")
            @Max(value = 250, message = "Nhịp tim phải từ 10 đến 250 lần/phút") Integer heartRate,
            @DecimalMin(value = "30.0", message = "Nhiệt độ phải từ 30 đến 45 °C")
            @DecimalMax(value = "45.0", message = "Nhiệt độ phải từ 30 đến 45 °C") BigDecimal temperature,
            @Size(max = 50, message = "Tình trạng ăn uống tối đa 50 ký tự") String appetiteStatus,
            String notes,
            @Size(max = 512, message = "Đường dẫn ảnh tối đa 512 ký tự") String photoUrl
    ) {}

    @Schema(name = "HealthLogResponse")
    public record Response(
            UUID logId,
            UUID planId,
            UUID horseId,
            String horseName,
            Integer stressLevel,
            Integer heartRate,
            BigDecimal temperature,
            String appetiteStatus,
            String notes,
            String photoUrl,
            LocalDateTime loggedAt,
            UUID loggedBy,
            String loggedByName
    ) {}
}
