package com.equiflow.repository;

import com.equiflow.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {

    List<RouteStop> findByPlanIdOrderBySequenceNoAsc(UUID planId);

    boolean existsByPlanIdAndSequenceNo(UUID planId, Integer sequenceNo);

    boolean existsByPlanIdAndSequenceNoAndStopIdNot(UUID planId, Integer sequenceNo, UUID stopId);

    @Query("select coalesce(max(s.sequenceNo), 0) from RouteStop s where s.planId = :planId")
    Integer maxSequenceNo(@Param("planId") UUID planId);
}
