package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Bản ghi kiểm tra kiểm dịch/thông quan của từng con ngựa (bảng inspection_statuses). */
@Entity
@Table(name = "inspection_statuses")
@Getter
@Setter
public class Inspection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "inspection_id")
    private UUID inspectionId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "horse_id", nullable = false)
    private UUID horseId;

    /** Cơ quan phụ trách: Hải quan, Trạm kiểm dịch động vật, Bộ Nông nghiệp... */
    @Column(name = "agency_name", nullable = false, length = 150)
    private String agencyName;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "remarks")
    private String remarks;

    @Column(name = "assigned_specialist_id")
    private UUID assignedSpecialistId;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
