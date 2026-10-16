package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public final class AssignmentDto {

    private AssignmentDto() {}

    /**
     * Body dùng chung cho POST và PUT. Cần ít nhất một trong ba: assetId, driverUserId, attendantUserId.
     * Tài xế và người đi kèm phải là tài khoản có vai trò DRIVER_ESCORT.
     */
    public record Request(
            UUID assetId,
            UUID driverUserId,
            UUID attendantUserId
    ) {}

    public record Response(
            UUID assignmentId,
            UUID planId,
            UUID assetId,
            String assetName,
            String assetType,
            UUID driverUserId,
            String driverName,
            UUID attendantUserId,
            String attendantName,
            LocalDateTime assignedAt
    ) {}
}
