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
        String imageUrl,
        Boolean available,
        String transportStatus,
        String transportStatusLabel,
        UUID activeRequestId,
        String activeRequestStatus
) {
    public HorseResponse(UUID horseId, String microchipId, String name, String gender,
                         String breed, Integer birthYear, BigDecimal weightKg, BigDecimal heightCm,
                         Integer recoveryDays, String pedigree, String medicalHistory, String allergies,
                         String temperament, UUID ownerUserId, String ownerName, LocalDateTime createdAt,
                         String imageUrl) {
        this(horseId, microchipId, name, gender, breed, birthYear, weightKg, heightCm,
             recoveryDays, pedigree, medicalHistory, allergies, temperament, ownerUserId,
             ownerName, createdAt, imageUrl, true, "AVAILABLE", "Khả dụng", null, null);
    }
}
