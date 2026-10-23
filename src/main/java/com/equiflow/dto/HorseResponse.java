package com.equiflow.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/** imageUrl: đường dẫn tương đối "/api/horses/{id}/image" (cần gửi kèm JWT để tải); null nếu ngựa chưa có ảnh. */
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
