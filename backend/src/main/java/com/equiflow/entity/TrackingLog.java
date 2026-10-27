package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Nhật ký hành trình: mỗi bản ghi là một vị trí GPS và/hoặc một mốc (Khởi hành, Thông quan...) của chuyến. */
@Entity
@Table(name = "tracking_logs")
@Getter
@Setter
public class TrackingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "log_id")
    private UUID logId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "milestone", length = 100)
    private String milestone;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "reported_at", nullable = false, updatable = false)
    private LocalDateTime reportedAt;

    @Column(name = "reported_by", nullable = false, updatable = false)
    private UUID reportedBy;

    @PrePersist
    void onCreate() {
        if (reportedAt == null) reportedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
