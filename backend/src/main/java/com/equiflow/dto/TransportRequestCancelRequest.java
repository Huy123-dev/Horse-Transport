package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TransportRequestCancelRequest(
        @NotBlank(message = "Vui lòng nhập lý do hủy")
        @Size(max = 500, message = "Lý do hủy tối đa 500 ký tự")
        String reason
) {}
