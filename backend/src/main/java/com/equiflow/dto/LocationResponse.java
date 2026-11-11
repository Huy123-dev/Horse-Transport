package com.equiflow.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record LocationResponse(
        UUID locationId,
        String name,
        String type,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer capacity,
        String contactInfo,
        String countryCode
) {}
