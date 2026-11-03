package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public final class CustomsRegulationDto {

    private CustomsRegulationDto() {}

    /** Body dùng chung cho POST /api/customs-regulations và PUT /api/customs-regulations/{id}. */
    public record Request(
            @NotBlank(message = "Vui lòng nhập mã quốc gia")
            @Pattern(regexp = "^[A-Za-z]{3}$", message = "Mã quốc gia gồm 3 chữ cái (ví dụ: VNM, JPN)") String countryCode,
            UUID portLocationId,
            String quarantineStandard,
            String requiredDocuments,
            @NotBlank(message = "Vui lòng nhập loại quy định (IMPORT hoặc EXPORT)") String importExportType
    ) {}

    public record Response(
            UUID regulationId,
            String countryCode,
            UUID portLocationId,
            String portLocationName,
            String quarantineStandard,
            String requiredDocuments,
            String importExportType
    ) {}
}
