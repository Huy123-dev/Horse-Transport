package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public final class NotificationDto {

    private NotificationDto() {}

    public record Response(
            UUID notificationId,
            String type,
            String title,
            String message,
            String relatedEntityType,
            UUID relatedEntityId,
            boolean read,
            LocalDateTime createdAt,
            LocalDateTime readAt
    ) {}

    public record UnreadCount(long count) {}
}
