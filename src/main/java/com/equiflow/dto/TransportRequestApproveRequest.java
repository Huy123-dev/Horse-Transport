package com.equiflow.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

/** Body (không bắt buộc) của PATCH /api/transport-requests/{id}/approve — manager có thể báo giá khi duyệt. */
public record TransportRequestApproveRequest(
        @PositiveOrZero(message = "Số tiền ước tính không được âm")
        @Digits(integer = 10, fraction = 2, message = "Số tiền ước tính không hợp lệ")
        BigDecimal estimatedAmount
) {}
