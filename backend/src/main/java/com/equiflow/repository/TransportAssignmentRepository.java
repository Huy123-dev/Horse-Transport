package com.equiflow.repository;

import com.equiflow.entity.TransportAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TransportAssignmentRepository extends JpaRepository<TransportAssignment, UUID> {

    List<TransportAssignment> findByPlanIdOrderByAssignedAtAsc(UUID planId);

    @Query("""
            select distinct a.planId from TransportAssignment a
            where a.driverUserId = :userId or a.attendantUserId = :userId
            """)
    List<UUID> findAssignedPlanIds(@Param("userId") UUID userId);

    @Query("""
            select distinct a.planId from TransportAssignment a
            where a.driverUserId = :userId
            """)
    List<UUID> findDriverPlanIds(@Param("userId") UUID userId);

    @Query("""
            select distinct a.planId from TransportAssignment a
            where a.attendantUserId = :userId
            """)
    List<UUID> findAttendantPlanIds(@Param("userId") UUID userId);

    @Query("""
            select count(a) from TransportAssignment a
            where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)
            """)
    long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);

    boolean existsByPlanId(UUID planId);

    boolean existsByAssetId(UUID assetId);

    boolean existsByPlanIdAndAssetIdAndAssignmentIdNot(UUID planId, UUID assetId, UUID assignmentId);
    boolean existsByPlanIdAndAssignmentIdNotAndAttendantUserId(UUID planId, UUID assignmentId, UUID attendantUserId);

    @Query("""
            select count(distinct a.attendantUserId) from TransportAssignment a
            where a.planId = :planId and a.assignmentId <> :assignmentId
              and a.attendantUserId is not null
            """)
    long countDistinctAttendantsByPlanIdAndAssignmentIdNot(
            @Param("planId") UUID planId, @Param("assignmentId") UUID assignmentId);

    /**
     * Phương tiện đã được phân cho kế hoạch KHÁC còn hiệu lực và trùng khoảng thời gian chưa?
     * (hai khoảng [a,b] và [c,d] giao nhau khi a < d và b > c)
     */
    @Query("""
            select count(a) from TransportAssignment a, TransportPlan p
            where a.planId = p.planId and a.assetId = :assetId and p.planId <> :planId
              and p.status in :openStatuses
              and p.departureTime < :end and p.arrivalTime > :start
            """)
    long countAssetConflicts(@Param("assetId") UUID assetId, @Param("planId") UUID planId,
                             @Param("openStatuses") Collection<String> openStatuses,
                             @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** Tương tự cho nhân sự: tài xế/người đi kèm không thể ở hai chuyến cùng lúc. */
    @Query("""
            select count(a) from TransportAssignment a, TransportPlan p
            where a.planId = p.planId and (a.driverUserId = :userId or a.attendantUserId = :userId)
              and p.planId <> :planId and p.status in :openStatuses
              and p.departureTime < :end and p.arrivalTime > :start
            """)
    long countUserConflicts(@Param("userId") UUID userId, @Param("planId") UUID planId,
                            @Param("openStatuses") Collection<String> openStatuses,
                            @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
