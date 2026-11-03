package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public final class QuarantineReservationDto {

    private QuarantineReservationDto() {}

    /** POST. Số ngựa cần chỗ = số ngựa trong yêu cầu vận chuyển. */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn yêu cầu vận chuyển") UUID requestId,
            @NotNull(message = "Vui lòng chọn cơ sở kiểm dịch") UUID facilityLocationId,
            @NotNull(message = "Vui lòng nhập ngày bắt đầu") LocalDate startDate,
            @NotNull(message = "Vui lòng nhập ngày kết thúc") LocalDate endDate
    ) {}

    /** PUT. Không đổi được yêu cầu vận chuyển của lịch đặt. */
    public record UpdateRequest(
            @NotNull(message = "Vui lòng chọn cơ sở kiểm dịch") UUID facilityLocationId,
            @NotNull(message = "Vui lòng nhập ngày bắt đầu") LocalDate startDate,
            @NotNull(message = "Vui lòng nhập ngày kết thúc") LocalDate endDate
    ) {}

    /** status: PENDING | CONFIRMED | IN_QUARANTINE | COMPLETED | CANCELLED */
    public record StatusRequest(@NotBlank(message = "Vui lòng nhập trạng thái") String status) {}

    public record Response(
            UUID reservationId,
            UUID requestId,
            UUID facilityLocationId,
            String facilityName,
            LocalDate startDate,
            LocalDate endDate,
            Integer horseCount,
            String status
    ) {}
}
