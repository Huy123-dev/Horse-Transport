package com.equiflow.dto;

import jakarta.validation.constraints.*;

import java.util.UUID;

public final class TransportAssetDto {

    private TransportAssetDto() {}

    /** Body dùng chung cho POST và PUT. status: AVAILABLE | IN_USE | MAINTENANCE (mặc định AVAILABLE). */
    public record Request(
            @NotBlank(message = "Vui lòng nhập tên phương tiện") @Size(max = 100, message = "Tên tối đa 100 ký tự") String name,
            @NotBlank(message = "Vui lòng nhập loại phương tiện (ví dụ TRUCK, AIR_CONTAINER, FLIGHT_SLOT)")
            @Size(max = 50, message = "Loại phương tiện tối đa 50 ký tự") String type,
            @NotNull(message = "Vui lòng nhập sức chứa") @Min(value = 1, message = "Sức chứa phải từ 1 con trở lên") Integer capacity,
            UUID ownerPartnerId,
            String status
    ) {}

    public record Response(
            UUID assetId,
            String name,
            String type,
            Integer capacity,
            UUID ownerPartnerId,
            String ownerPartnerName,
            String status
    ) {}
}
