package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public final class InspectionDto {

    private InspectionDto() {}

    /**
     * POST /api/inspections: mỗi bản ghi là một con ngựa được một cơ quan kiểm tra.
     * assignedSpecialistId bỏ trống = người đang đăng nhập.
     */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn yêu cầu vận chuyển") UUID requestId,
            @NotNull(message = "Vui lòng chọn ngựa") UUID horseId,
            @NotBlank(message = "Vui lòng nhập tên cơ quan kiểm tra") @Size(max = 150, message = "Tên cơ quan tối đa 150 ký tự") String agencyName,
            String remarks,
            UUID assignedSpecialistId
    ) {}

    /** PATCH /api/inspections/{id}/status. status: PENDING | PROCESSING | NEEDS_INFO | APPROVED | REJECTED. */
    public record StatusRequest(
            @NotBlank(message = "Vui lòng nhập trạng thái") String status,
            String remarks
    ) {}

    public record Response(
            UUID inspectionId,
            UUID requestId,
            UUID horseId,
            String horseName,
            String horseImageUrl,
            String agencyName,
            String status,
            String remarks,
            UUID assignedSpecialistId,
            String specialistName,
            LocalDateTime updatedAt
    ) {}
}
