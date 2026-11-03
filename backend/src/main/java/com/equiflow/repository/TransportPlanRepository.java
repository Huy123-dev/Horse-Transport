package com.equiflow.repository;

import com.equiflow.entity.TransportPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransportPlanRepository extends JpaRepository<TransportPlan, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from TransportPlan p where p.planId = :planId")
    Optional<TransportPlan> findByIdForUpdate(@Param("planId") UUID planId);

    List<TransportPlan> findAllByOrderByDepartureTimeDesc();
    List<TransportPlan> findByRequestIdOrderByDepartureTimeDesc(UUID requestId);
    List<TransportPlan> findByRequestIdInOrderByDepartureTimeDesc(Collection<UUID> requestIds);
    List<TransportPlan> findByPlanIdInOrderByDepartureTimeDesc(Collection<UUID> planIds);
    boolean existsByRequestIdAndStatusNot(UUID requestId, String status);
    long countByStatus(String status);
}
