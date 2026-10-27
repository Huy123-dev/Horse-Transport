package com.equiflow.repository;

import com.equiflow.entity.Horse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface HorseRepository extends JpaRepository<Horse, UUID> {
    boolean existsByMicrochipId(String microchipId);
    boolean existsByMicrochipIdAndHorseIdNot(String microchipId, UUID horseId);
    List<Horse> findAllByOrderByCreatedAtDesc();
    List<Horse> findByHorseIdInOrderByCreatedAtDesc(Collection<UUID> horseIds);
    List<Horse> findByOwnerUserIdOrderByCreatedAtDesc(UUID ownerUserId);
}
