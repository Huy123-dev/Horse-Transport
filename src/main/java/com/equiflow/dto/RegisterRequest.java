package com.equiflow.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên") @Size(max = 100, message = "Họ và tên tối đa 100 ký tự") String name,
        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^(0|\\+84)\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 255) String email,
        @NotBlank(message = "Vui lòng nhập tên trang trại / tổ chức") @Size(max = 150, message = "Tối đa 150 ký tự") String organizationName,
        @NotBlank(message = "Vui lòng nhập mật khẩu") @Size(min = 8, max = 72, message = "Mật khẩu tối thiểu 8 ký tự") String password,
        @NotBlank(message = "Vui lòng xác nhận mật khẩu") String confirmPassword
) {}
