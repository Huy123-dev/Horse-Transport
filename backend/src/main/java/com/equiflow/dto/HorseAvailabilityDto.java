package com.equiflow.dto;

import java.util.UUID;

public record HorseAvailabilityDto(
        UUID horseId,
        boolean available,
        String status,              // AVAILABLE, IN_REQUEST, IN_TRANSIT
        String statusLabel,         // "Khả dụng", "Đang có đơn vận chuyển", "Đang trong chuyến vận chuyển"
        UUID activeRequestId,
        String activeRequestStatus,
        String activePlanStatus,
        String reason
) {}
