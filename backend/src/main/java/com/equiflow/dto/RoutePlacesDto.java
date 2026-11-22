package com.equiflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RoutePlacesDto(
        @NotNull @Size(min = 2, max = 600) List<@NotNull @Valid Point> path,
        @NotNull Mode mode) {

    public enum Mode {
        FULL,
        RARE
    }

    public record Point(
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng) {
    }

    public record Place(String id, String name, String category, double lat, double lng) {
    }

    public record Response(List<Place> places, String mode) {
    }
}
