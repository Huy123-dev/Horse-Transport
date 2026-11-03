package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank(message = "Thiếu token đăng nhập Google") String idToken
) {}
