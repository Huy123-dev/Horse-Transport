package com.equiflow.repository;

import com.equiflow.entity.HealthLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface HealthLogRepository extends JpaRepository<HealthLog, UUID> {

    /** Nhật ký sức khỏe của chuyến, mới nhất trước. */
    List<HealthLog> findByPlanIdOrderByLoggedAtDesc(UUID planId);

    /** Lịch sử sức khỏe của một con ngựa (qua mọi chuyến), mới nhất trước. */
    List<HealthLog> findByHorseIdOrderByLoggedAtDesc(UUID horseId);

    /** Lịch sử giới hạn trong các kế hoạch mà người dùng được phân công. */
    List<HealthLog> findByHorseIdAndPlanIdInOrderByLoggedAtDesc(UUID horseId, List<UUID> planIds);

    /** Số phân công của người dùng (tài xế hoặc người đi kèm) trong kế hoạch; 0 = không thuộc chuyến này. */
    @Query("""
            select count(a) from TransportAssignment a
            where a.planId = :planId and (a.driverUserId = :userId or a.attendantUserId = :userId)
            """)
    long countCrewAssignments(@Param("planId") UUID planId, @Param("userId") UUID userId);
}
