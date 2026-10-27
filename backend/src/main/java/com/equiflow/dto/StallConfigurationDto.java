package com.equiflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class StallConfigurationDto {

    private StallConfigurationDto() {}

    public record Request(
            @NotNull UUID horseId,
            @NotBlank @Pattern(regexp = "(?i)^(SMALL|MEDIUM|LARGE|EXTRA_LARGE|CUSTOM)$") String size,
            @DecimalMin(value = "0.01") BigDecimal lengthMeters,
            @DecimalMin(value = "0.01") BigDecimal widthMeters
    ) {}

    public record CreateRequest(@NotNull @Size(min = 1) List<@Valid Request> configurations) {}

    public record Response(
            UUID horseId,
            String horseName,
            String size,
            BigDecimal lengthMeters,
            BigDecimal widthMeters
    ) {}
}
