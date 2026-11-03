package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Nhật ký sức khỏe của một con ngựa trong một chuyến vận chuyển. */
@Entity
@Table(name = "health_logs")
@Getter
@Setter
public class HealthLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "log_id")
    private UUID logId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "horse_id", nullable = false)
    private UUID horseId;

    /** Mức độ căng thẳng 1-10. */
    @Column(name = "stress_level")
    private Integer stressLevel;

    /** Nhịp tim (lần/phút). */
    @Column(name = "heart_rate")
    private Integer heartRate;

    /** Nhiệt độ cơ thể (°C), DECIMAL(4,2). */
    @Column(name = "temperature", precision = 4, scale = 2)
    private BigDecimal temperature;

    @Column(name = "appetite_status", length = 50)
    private String appetiteStatus;

    @Column(name = "notes")
    private String notes;

    @Column(name = "photo_url", length = 512)
    private String photoUrl;

    @Column(name = "logged_at", nullable = false, updatable = false)
    private LocalDateTime loggedAt;

    @Column(name = "logged_by", nullable = false, updatable = false)
    private UUID loggedBy;

    @PrePersist
    void onCreate() {
        if (loggedAt == null) loggedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
