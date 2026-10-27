package com.equiflow.dto;

import jakarta.validation.constraints.*;

/** password là tùy chọn: bỏ trống (null) thì giữ nguyên mật khẩu hiện tại. */
public record UserUpdateRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên") @Size(max = 100, message = "Họ và tên tối đa 100 ký tự") String name,
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 255, message = "Email tối đa 255 ký tự") String email,
        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^(0|\\+84)\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
        @Size(max = 150, message = "Tên tổ chức tối đa 150 ký tự") String organizationName,
        @Size(min = 8, max = 72, message = "Mật khẩu tối thiểu 8 ký tự") String password,
        @NotBlank(message = "Vui lòng chọn vai trò") @Size(max = 50, message = "Vai trò không hợp lệ") String roleId
) {}
