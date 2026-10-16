package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/** Nhật ký hệ thống (chỉ đọc qua API). user_id để trống với các sự kiện hệ thống tự ghi. */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
public class AuditLog {

    @Id
    @Column(name = "log_id")
    private UUID logId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 150)
    private String action;

    @Column(name = "details")
    private String details;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
