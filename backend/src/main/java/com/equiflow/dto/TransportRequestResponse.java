package com.equiflow.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TransportRequestResponse(
        UUID requestId,
        UUID customerId,
        String customerName,
        LocationInfo origin,
        LocationInfo destination,
        LocalDate scheduledDepartureDate,
        LocalDate scheduledArrivalDate,
        String specialRequirements,
        String status,
        BigDecimal estimatedAmount,
        String currency,
        UUID approvedBy,
        String approvedByName,
        LocalDateTime approvedAt,
        UUID specialistApprovedBy,
        String specialistApprovedByName,
        LocalDateTime specialistApprovedAt,
        String rejectionReason,
        UUID cancelledBy,
        LocalDateTime cancelledAt,
        String cancellationReason,
        List<HorseInfo> horses,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record LocationInfo(UUID locationId, String name, String countryCode) {}

    public record HorseInfo(UUID horseId, String name, String microchipId, String imageUrl) {}
}
