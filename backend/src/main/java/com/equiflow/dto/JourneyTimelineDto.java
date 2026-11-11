package com.equiflow.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class JourneyTimelineDto {

    private JourneyTimelineDto() {}

    public record Response(
            UUID eventId,
            String type,
            LocalDateTime timestamp,
            String title,
            String description,
            BigDecimal latitude,
            BigDecimal longitude,
            UUID horseId,
            String horseName,
            String status,
            Boolean sos
    ) {}
}
