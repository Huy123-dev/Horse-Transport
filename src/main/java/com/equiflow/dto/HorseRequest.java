package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Body dùng chung cho POST /api/horses và PUT /api/horses/{id}.
 * ownerUserId chỉ có tác dụng với nhân viên; với CUSTOMER sẽ bị bỏ qua (chủ ngựa luôn là chính họ).
 */
public record HorseRequest(
        @NotBlank(message = "Vui lòng nhập mã microchip") @Size(max = 50, message = "Mã microchip tối đa 50 ký tự") String microchipId,
        @NotBlank(message = "Vui lòng nhập tên ngựa") @Size(max = 100, message = "Tên ngựa tối đa 100 ký tự") String name,
        @NotBlank(message = "Vui lòng chọn giới tính") @Size(max = 20, message = "Giới tính không hợp lệ") String gender,
        String pedigree,
        String medicalHistory,
        String allergies,
        String temperament,
        UUID ownerUserId
) {}
