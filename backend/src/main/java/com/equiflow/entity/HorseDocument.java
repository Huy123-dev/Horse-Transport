package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "horse_documents")
@Getter
@Setter
public class HorseDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "horse_id", nullable = false)
    private UUID horseId;

    /** Hồ sơ có thể gắn với một yêu cầu vận chuyển cụ thể (nullable). */
    @Column(name = "request_id")
    private UUID requestId;

    @Column(name = "document_type", nullable = false, length = 100)
    private String documentType;

    @Column(name = "file_url", nullable = false, length = 512)
    private String fileUrl;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @PrePersist
    void onCreate() {
        uploadedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
