package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body của PATCH /api/transport-requests/{id}/reject. */
public record TransportRequestRejectRequest(
        @NotBlank(message = "Vui lòng nhập lý do từ chối")
        @Size(max = 500, message = "Lý do tối đa 500 ký tự")
        String reason
) {}
