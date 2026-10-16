package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** Thông tin tài khoản trả về cho quản trị viên (không bao giờ chứa password_hash). */
public record UserResponse(
        UUID userId,
        String name,
        String email,
        String phoneNumber,
        String organizationName,
        String roleId,
        String roleName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
