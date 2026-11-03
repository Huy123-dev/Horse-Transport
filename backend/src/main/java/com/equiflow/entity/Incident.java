package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Sự cố phát sinh trong chuyến vận chuyển (có thể là SOS khẩn cấp và/hoặc kèm chi phí phát sinh). */
@Entity
@Table(name = "incidents")
@Getter
@Setter
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "incident_id")
    private UUID incidentId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    /** Loại sự cố, nhập tự do (ví dụ "Thoi tiet xau"). */
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "is_sos", nullable = false)
    private boolean sos;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    /** "Dang xu ly" | "Da xu ly" */
    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "additional_cost", precision = 12, scale = 2)
    private BigDecimal additionalCost;

    /** Logistics Manager đã duyệt chi phí phát sinh; null = chưa duyệt. */
    @Column(name = "cost_approved_by")
    private UUID costApprovedBy;

    @Column(name = "reported_at", nullable = false, updatable = false)
    private LocalDateTime reportedAt;

    @PrePersist
    void onCreate() {
        if (reportedAt == null) reportedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
