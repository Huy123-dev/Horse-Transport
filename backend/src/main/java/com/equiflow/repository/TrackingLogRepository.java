package com.equiflow.repository;

import com.equiflow.entity.TrackingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrackingLogRepository extends JpaRepository<TrackingLog, UUID> {

    /** Lịch sử hành trình theo thứ tự thời gian (cũ -> mới). */
    List<TrackingLog> findByPlanIdOrderByReportedAtAsc(UUID planId);

    /** Bản ghi mới nhất của chuyến. */
    Optional<TrackingLog> findFirstByPlanIdOrderByReportedAtDesc(UUID planId);

    /** Số phân công của người dùng (tài xế hoặc người đi kèm) trong kế hoạch; 0 = không thuộc chuyến này. */
    @Query("""
            select count(a) from TransportAssignment a
            where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)
            """)
    long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
}
