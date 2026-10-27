package com.equiflow.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Body tùy chọn của PATCH /api/transport-requests/{id}/approve.
 * Hỗ trợ:
 * - previewFingerprint: Khóa snapshot báo giá dịch vụ (Pricing Module).
 * - estimatedAmount: Báo giá ước tính trực tiếp khi duyệt đơn.
 */
public record TransportRequestApproveRequest(
        @PositiveOrZero(message = "Số tiền ước tính không được âm")
        @Digits(integer = 10, fraction = 2, message = "Số tiền ước tính không hợp lệ")
        BigDecimal estimatedAmount,

        @Size(max = 128, message = "Mã fingerprint tối đa 128 ký tự")
        String previewFingerprint
) {}
