package com.equiflow.repository;

import com.equiflow.entity.TrackingLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrackingLogRepository extends JpaRepository<TrackingLog, UUID> {

    /** Lịch sử hành trình theo thứ tự thời gian (cũ -> mới). */
    List<TrackingLog> findByPlanIdOrderByReportedAtAsc(UUID planId);

    /** Bản ghi mới nhất của chuyến. */
    Optional<TrackingLog> findFirstByPlanIdOrderByReportedAtDesc(UUID planId);
}
