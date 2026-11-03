package com.equiflow.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Body của POST /api/transport-requests (customer tạo yêu cầu). */
public record TransportRequestCreateRequest(
        @NotNull(message = "Vui lòng chọn điểm đi") UUID originLocationId,
        @NotNull(message = "Vui lòng chọn điểm đến") UUID destinationLocationId,
        @NotNull(message = "Vui lòng chọn ngày khởi hành") LocalDate scheduledDepartureDate,
        @NotNull(message = "Vui lòng chọn ngày đến dự kiến") LocalDate scheduledArrivalDate,
        @NotEmpty(message = "Vui lòng chọn ít nhất một con ngựa") List<@NotNull(message = "Mã ngựa không hợp lệ") UUID> horseIds,
        @Size(max = 4000, message = "Yêu cầu đặc biệt tối đa 4000 ký tự") String specialRequirements,
        @Pattern(regexp = "(?i)^USD$", message = "Đơn vị tiền tệ duy nhất được hỗ trợ là USD") String currency,
        @jakarta.validation.Valid List<StallConfigurationDto.Request> stallConfigurations,
        @NotNull(message = "Vui lòng chọn gói vận chuyển")
        @jakarta.validation.Valid PricingDto.SelectionRequest pricingSelection
) {}
