package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserInfo(
        UUID userId,
        String name,
        String email,
        String phoneNumber,
        String organizationName,
        String roleId,
        String staffType,
        String avatarUrl,
        Boolean active,
        LocalDateTime createdAt
) {
    public UserInfo(UUID userId, String name, String email, String phoneNumber,
                    String organizationName, String roleId, String staffType) {
        this(userId, name, email, phoneNumber, organizationName, roleId, staffType, null, true, null);
    }
}
