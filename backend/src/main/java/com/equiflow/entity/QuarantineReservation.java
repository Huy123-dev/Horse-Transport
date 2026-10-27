package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "quarantine_reservations")
@Getter
@Setter
public class QuarantineReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "reservation_id")
    private UUID reservationId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    /** Cơ sở kiểm dịch (một dòng trong bảng locations). */
    @Column(name = "facility_location_id", nullable = false)
    private UUID facilityLocationId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 50)
    private String status;
}
