package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "horse_transport_reservations")
@Getter
@Setter
public class HorseTransportReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "reservation_id")
    private UUID reservationId;

    @Column(name = "horse_id", nullable = false)
    private UUID horseId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(nullable = false, length = 30)
    private String status; // ACTIVE, RELEASED

    @Column(name = "reserved_at", nullable = false)
    private LocalDateTime reservedAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @Column(name = "release_reason", length = 200)
    private String releaseReason;

    @PrePersist
    void onCreate() {
        if (reservedAt == null) {
            reservedAt = LocalDateTime.now(ZoneOffset.UTC);
        }
        if (status == null) {
            status = "ACTIVE";
        }
    }
}
