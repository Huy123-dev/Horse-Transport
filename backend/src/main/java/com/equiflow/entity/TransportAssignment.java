package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Phân công phương tiện + tài xế + người đi kèm cho một kế hoạch. Cần ít nhất một trong ba. */
@Entity
@Table(name = "transport_assignments")
@Getter
@Setter
public class TransportAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "asset_id")
    private UUID assetId;

    @Column(name = "driver_user_id")
    private UUID driverUserId;

    @Column(name = "attendant_user_id")
    private UUID attendantUserId;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    @PrePersist
    void onCreate() {
        assignedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
