package com.equiflow.repository;

import com.equiflow.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    List<Incident> findAllByOrderByReportedAtDesc();

    List<Incident> findByPlanIdOrderByReportedAtDesc(UUID planId);

    List<Incident> findByPlanIdInOrderByReportedAtDesc(Collection<UUID> planIds);

    /** Số phân công của người dùng (tài xế hoặc người đi kèm) trong kế hoạch; 0 = không thuộc chuyến này. */
    @Query("""
            select count(a) from TransportAssignment a
            where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)
            """)
    long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
}
