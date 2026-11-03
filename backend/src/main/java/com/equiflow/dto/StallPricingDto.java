package com.equiflow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class StallPricingDto {

    private StallPricingDto() {}

    public record SizeDetail(
            String size,
            String label,
            BigDecimal lengthMeters,
            BigDecimal widthMeters,
            String dimensionsFormatted,
            BigDecimal priceUsd
    ) {}

    public record ConfigResponse(
            UUID configId,
            BigDecimal basePriceSmall,
            BigDecimal mediumMultiplier,
            BigDecimal largeMultiplier,
            BigDecimal extraLargeMultiplier,
            String currency,
            boolean active,
            SizeDetail small,
            SizeDetail medium,
            SizeDetail large,
            SizeDetail extraLarge,
            UUID updatedBy,
            LocalDateTime updatedAt
    ) {}

    public record UpdateConfigRequest(
            @NotNull(message = "Giá cơ sở Small không được để trống")
            @DecimalMin(value = "0.00", message = "Giá cơ sở không được âm")
            @Digits(integer = 10, fraction = 2, message = "Giá tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal basePriceSmall,

            @NotNull(message = "Hệ số Medium không được để trống")
            @DecimalMin(value = "0.01", message = "Hệ số Medium phải lớn hơn 0")
            @Digits(integer = 4, fraction = 2, message = "Hệ số tối đa 4 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal mediumMultiplier,

            @NotNull(message = "Hệ số Large không được để trống")
            @DecimalMin(value = "0.01", message = "Hệ số Large phải lớn hơn 0")
            @Digits(integer = 4, fraction = 2, message = "Hệ số tối đa 4 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal largeMultiplier,

            @NotNull(message = "Hệ số Extra Large không được để trống")
            @DecimalMin(value = "0.01", message = "Hệ số Extra Large phải lớn hơn 0")
            @Digits(integer = 4, fraction = 2, message = "Hệ số tối đa 4 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal extraLargeMultiplier,

            BigDecimal smallLengthMeters,
            BigDecimal smallWidthMeters,
            BigDecimal mediumLengthMeters,
            BigDecimal mediumWidthMeters,
            BigDecimal largeLengthMeters,
            BigDecimal largeWidthMeters,
            BigDecimal extraLargeLengthMeters,
            BigDecimal extraLargeWidthMeters,

            Boolean active
    ) {}
}
