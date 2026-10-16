package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public final class AuditLogDto {

    private AuditLogDto() {}

    /** userId/userName để trống với sự kiện hệ thống tự ghi. */
    public record Response(
            UUID logId,
            UUID userId,
            String userName,
            String action,
            String details,
            String ipAddress,
            LocalDateTime createdAt
    ) {}
}
