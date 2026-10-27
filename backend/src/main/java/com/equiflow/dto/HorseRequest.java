package com.equiflow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Body dùng chung cho POST /api/horses và PUT /api/horses/{id}.
 * ownerUserId chỉ có tác dụng với nhân viên; với CUSTOMER sẽ bị bỏ qua (chủ ngựa luôn là chính họ).
 */
public record HorseRequest(
        @NotBlank(message = "Vui lòng nhập mã microchip") @Size(max = 50, message = "Mã microchip tối đa 50 ký tự") String microchipId,
        @NotBlank(message = "Vui lòng nhập tên ngựa") @Size(max = 100, message = "Tên ngựa tối đa 100 ký tự") String name,
        @NotBlank(message = "Vui lòng chọn giới tính") @Size(max = 20, message = "Giới tính không hợp lệ") String gender,
        @Size(max = 100, message = "Giống ngựa tối đa 100 ký tự") String breed,
        @Min(value = 1980, message = "Năm sinh từ 1980 trở lại đây") @Max(value = 2035, message = "Năm sinh không hợp lệ") Integer birthYear,
        @DecimalMin(value = "1.0", message = "Cân nặng phải lớn hơn 0") @DecimalMax(value = "2000.0", message = "Cân nặng tối đa 2000kg") BigDecimal weightKg,
        @DecimalMin(value = "1.0", message = "Chiều cao phải lớn hơn 0") @DecimalMax(value = "300.0", message = "Chiều cao tối đa 300cm") BigDecimal heightCm,
        @Min(value = 0, message = "Thời gian hồi phục không thể âm") Integer recoveryDays,
        String pedigree,
        String medicalHistory,
        String allergies,
        String temperament,
        UUID ownerUserId,
        @Size(max = 512, message = "Đường dẫn ảnh tối đa 512 ký tự") String imageUrl
) {
    public HorseRequest(
            String microchipId,
            String name,
            String gender,
            String pedigree,
            String medicalHistory,
            String allergies,
            String temperament,
            UUID ownerUserId,
            String imageUrl
    ) {
        this(microchipId, name, gender, null, null, null, null, null, pedigree, medicalHistory, allergies, temperament, ownerUserId, imageUrl);
    }
}
