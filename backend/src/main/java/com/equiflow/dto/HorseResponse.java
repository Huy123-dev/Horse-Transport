package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record HorseResponse(
        UUID horseId,
        String microchipId,
        String name,
        String gender,
        String pedigree,
        String medicalHistory,
        String allergies,
        String temperament,
        UUID ownerUserId,
        String ownerName,
        LocalDateTime createdAt,
        String imageUrl
) {}
