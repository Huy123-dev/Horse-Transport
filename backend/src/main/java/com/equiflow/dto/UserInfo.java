package com.equiflow.dto;

import java.util.UUID;

public record UserInfo(
        UUID userId,
        String name,
        String email,
        String phoneNumber,
        String organizationName,
        String roleId,
        String staffType
) {}
