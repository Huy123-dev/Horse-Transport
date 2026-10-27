package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class AssignmentDto {

    private AssignmentDto() {}

    /**
     * Body dùng chung cho POST và PUT. Cần ít nhất một trong ba: assetId, driverUserId, attendantUserId.
     * DRIVER is assigned as the driver and ESCORT as the attendant; legacy DRIVER_ESCORT accounts remain compatible.
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

    public record Option(UUID id, String label, String status) {}

    public record OptionsResponse(
            List<Option> assets,
            List<Option> crew,
            List<Option> drivers,
            List<Option> attendants
    ) {}
}
