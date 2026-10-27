package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class TransportPlanDto {

    private TransportPlanDto() {}

    /** coordinatorId bỏ trống = người đang đăng nhập nếu họ là FLEET_COORDINATOR, ngược lại để trống. */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn yêu cầu vận chuyển") UUID requestId,
            String routeDetails,
            @NotNull(message = "Vui lòng nhập thời gian khởi hành") LocalDateTime departureTime,
            @NotNull(message = "Vui lòng nhập thời gian đến") LocalDateTime arrivalTime,
            UUID coordinatorId
    ) {}

    public record UpdateRequest(
            String routeDetails,
            @NotNull(message = "Vui lòng nhập thời gian khởi hành") LocalDateTime departureTime,
            @NotNull(message = "Vui lòng nhập thời gian đến") LocalDateTime arrivalTime,
            UUID coordinatorId
    ) {}

    /** status: PLANNING | READY | IN_PROGRESS | CANCELLED. */
    public record StatusRequest(@NotBlank(message = "Vui lòng nhập trạng thái") String status) {}

    public record Response(
            UUID planId,
            UUID requestId,
            String routeDetails,
            LocalDateTime departureTime,
            LocalDateTime arrivalTime,
            String status,
            UUID coordinatorId,
            String coordinatorName,
            List<UUID> horseIds,
            List<HorseInfo> horses
    ) {}

    public record HorseInfo(UUID horseId, String name, String microchipId, String imageUrl) {}
}
