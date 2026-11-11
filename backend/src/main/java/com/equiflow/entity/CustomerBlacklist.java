package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "customer_blacklist")
@Getter
@Setter
public class CustomerBlacklist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "blacklist_id")
    private UUID blacklistId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "restricted_by_id", nullable = false)
    private UUID restrictedById;

    @Column(name = "restricted_at", nullable = false)
    private LocalDateTime restrictedAt;

    @Column(nullable = false, length = 100)
    private String reason;

    @Column(name = "description")
    private String description;

    @Column(name = "related_request_id")
    private UUID relatedRequestId;

    @Column(name = "related_invoice_id")
    private UUID relatedInvoiceId;

    @Column(name = "amount_due", precision = 18, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "evidence_url", length = 500)
    private String evidenceUrl;

    /** RESTRICTED, PENDING_REVIEW, APPROVED_FOR_REACTIVATION, REJECTED */
    @Column(nullable = false, length = 50)
    private String status = "RESTRICTED";

    @Column(name = "resolution_notes")
    private String resolutionNotes;

    @Column(name = "resolved_by_id")
    private UUID resolvedById;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "reactivated_at")
    private LocalDateTime reactivatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (restrictedAt == null) restrictedAt = now;
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
