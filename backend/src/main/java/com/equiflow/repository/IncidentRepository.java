package com.equiflow.repository;

import com.equiflow.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    List<Incident> findAllByOrderByReportedAtDesc();

    List<Incident> findByPlanIdOrderByReportedAtDesc(UUID planId);

    List<Incident> findByPlanIdInOrderByReportedAtDesc(Collection<UUID> planIds);
}
