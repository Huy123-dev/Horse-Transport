package com.equiflow.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record HorseResponse(
        UUID horseId,
        String microchipId,
        String name,
        String gender,
        String breed,
        Integer birthYear,
        BigDecimal weightKg,
        BigDecimal heightCm,
        Integer recoveryDays,
        String pedigree,
        String medicalHistory,
        String allergies,
        String temperament,
        UUID ownerUserId,
        String ownerName,
        LocalDateTime createdAt,
        String imageUrl
) {}
