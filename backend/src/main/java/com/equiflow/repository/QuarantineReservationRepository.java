package com.equiflow.repository;

import com.equiflow.entity.QuarantineReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QuarantineReservationRepository extends JpaRepository<QuarantineReservation, UUID> {

    List<QuarantineReservation> findAllByOrderByStartDateDesc();

    List<QuarantineReservation> findByRequestIdInOrderByStartDateDesc(Collection<UUID> requestIds);

    /** Các lịch còn chiếm chỗ tại cơ sở trong khoảng ngày giao nhau (dùng để kiểm tra sức chứa). */
    @Query("""
            select r from QuarantineReservation r
            where r.facilityLocationId = :locationId and r.status in :activeStatuses
              and r.startDate <= :endDate and r.endDate >= :startDate
            """)
    List<QuarantineReservation> findOverlapping(@Param("locationId") UUID locationId,
                                                @Param("activeStatuses") Collection<String> activeStatuses,
                                                @Param("startDate") LocalDate startDate,
                                                @Param("endDate") LocalDate endDate);
}
