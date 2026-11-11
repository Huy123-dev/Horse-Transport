package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Biên bản bàn giao ngựa tại điểm đến (chữ ký người nhận + chứng từ POD). */
@Entity
@Table(name = "deliveries")
@Getter
@Setter
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "delivery_id")
    private UUID deliveryId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "signature_image_url", nullable = false, length = 512)
    private String signatureImageUrl;

    @Column(name = "delivered_at", nullable = false)
    private LocalDateTime deliveredAt;

    @Column(name = "pod_document_url", length = 512)
    private String podDocumentUrl;

    @PrePersist
    void onCreate() {
        if (deliveredAt == null) {
            deliveredAt = LocalDateTime.now(ZoneOffset.UTC);
        }
    }
}
