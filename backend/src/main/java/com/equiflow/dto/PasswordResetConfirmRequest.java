package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmRequest(
        @NotBlank @Size(min = 32, max = 128) String token,
        @NotBlank @Size(min = 8, max = 72) String password
) {}
