package com.equiflow.repository;

import com.equiflow.entity.TransportPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TransportPlanRepository extends JpaRepository<TransportPlan, UUID> {
    List<TransportPlan> findAllByOrderByDepartureTimeDesc();
    List<TransportPlan> findByRequestIdOrderByDepartureTimeDesc(UUID requestId);
    List<TransportPlan> findByRequestIdInOrderByDepartureTimeDesc(Collection<UUID> requestIds);
    boolean existsByRequestIdAndStatusNot(UUID requestId, String status);
}
