package com.equiflow.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/** Body dùng chung cho POST /api/locations và PUT /api/locations/{id}. */
public record LocationRequest(
        @NotBlank(message = "Vui lòng nhập tên địa điểm") @Size(max = 150, message = "Tên địa điểm tối đa 150 ký tự") String name,
        @NotBlank(message = "Vui lòng nhập loại địa điểm") @Size(max = 50, message = "Loại địa điểm tối đa 50 ký tự") String type,
        @NotNull(message = "Vui lòng nhập vĩ độ")
        @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90") @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90")
        @Digits(integer = 3, fraction = 6, message = "Vĩ độ tối đa 6 chữ số thập phân") BigDecimal latitude,
        @NotNull(message = "Vui lòng nhập kinh độ")
        @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180") @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180")
        @Digits(integer = 3, fraction = 6, message = "Kinh độ tối đa 6 chữ số thập phân") BigDecimal longitude,
        @Min(value = 0, message = "Sức chứa không được âm") Integer capacity,
        String contactInfo,
        @NotBlank(message = "Vui lòng nhập mã quốc gia")
        @Pattern(regexp = "^[A-Za-z]{3}$", message = "Mã quốc gia gồm 3 chữ cái (ví dụ: VNM, JPN)") String countryCode
) {}
