package com.equiflow.repository;

import com.equiflow.entity.HorseTransportReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HorseTransportReservationRepository extends JpaRepository<HorseTransportReservation, UUID> {

    List<HorseTransportReservation> findByHorseIdInAndStatus(Collection<UUID> horseIds, String status);

    Optional<HorseTransportReservation> findByHorseIdAndStatus(UUID horseId, String status);

    List<HorseTransportReservation> findByRequestIdAndStatus(UUID requestId, String status);

    List<HorseTransportReservation> findByRequestId(UUID requestId);

    boolean existsByHorseIdAndStatus(UUID horseId, String status);

    @Query("SELECT r.horseId FROM HorseTransportReservation r WHERE r.horseId IN :horseIds AND r.status = 'ACTIVE'")
    List<UUID> findActiveReservedHorseIds(@Param("horseIds") Collection<UUID> horseIds);
}
