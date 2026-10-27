package com.equiflow.repository;

import com.equiflow.entity.HorseDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HorseDocumentRepository extends JpaRepository<HorseDocument, UUID> {
    List<HorseDocument> findByHorseIdOrderByUploadedAtDesc(UUID horseId);
}
