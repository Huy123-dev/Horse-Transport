package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public final class ProfileDto {

    private ProfileDto() {}

    public record Response(
            UUID userId,
            String name,
            String email,
            String phoneNumber,
            String organizationName,
            String roleId,
            String roleName,
            String staffType,
            String avatarUrl,
            boolean active,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record UpdateRequest(
            @NotBlank(message = "Họ và tên không được để trống")
            @Size(min = 2, max = 100, message = "Họ và tên từ 2 đến 100 ký tự")
            String name,

            @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
            String phoneNumber,

            @Size(max = 150, message = "Tên tổ chức / trang trại tối đa 150 ký tự")
            String organizationName,

            @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
            String avatarUrl
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
            String oldPassword,

            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Size(min = 6, message = "Mật khẩu mới tối thiểu 6 ký tự")
            String newPassword
    ) {}
}
