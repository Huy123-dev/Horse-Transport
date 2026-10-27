package com.equiflow.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public final class RouteStopDto {

    private RouteStopDto() {}

    /**
     * Body dùng chung cho POST và PUT.
     * stopType: ORIGIN | TRANSIT | CUSTOMS | QUARANTINE | REST | REFUEL | DESTINATION.
     * sequenceNo bỏ trống: khi thêm sẽ xếp cuối tuyến, khi sửa giữ nguyên.
     * Cần locationId hoặc stopName (bỏ trống stopName thì lấy tên địa điểm).
     */
    public record Request(
            UUID locationId,
            @Min(value = 1, message = "Thứ tự điểm dừng phải từ 1") Integer sequenceNo,
            @Size(max = 150, message = "Tên điểm dừng tối đa 150 ký tự") String stopName,
            @NotBlank(message = "Vui lòng nhập loại điểm dừng") String stopType,
            LocalDateTime plannedArrivalTime,
            LocalDateTime plannedDepartureTime,
            LocalDateTime actualArrivalTime,
            LocalDateTime actualDepartureTime,
            String notes
    ) {}

    public record Response(
            UUID stopId,
            UUID planId,
            Integer sequenceNo,
            UUID locationId,
            String locationName,
            String countryCode,
            String stopName,
            String stopType,
            LocalDateTime plannedArrivalTime,
            LocalDateTime plannedDepartureTime,
            LocalDateTime actualArrivalTime,
            LocalDateTime actualDepartureTime,
            String notes
    ) {}
}
