package com.equiflow.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "compensation_claims")
@Getter
@Setter
public class CompensationClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "claim_id")
    private UUID claimId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false, length = 4000)
    private String description;

    @Column(length = 50)
    private String category;

    @Column(length = 20)
    private String severity;

    @Column(length = 3, nullable = false)
    private String currency = "USD";

    @Column(name = "requested_amount", precision = 12, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "approved_amount", precision = 12, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "evidence_url", length = 512)
    private String evidenceUrl;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "decision_note", length = 2000)
    private String decisionNote;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @jakarta.persistence.PrePersist
    void onCreate() {
        submittedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
