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
@Table(name = "customer_blacklist_appeals")
@Getter
@Setter
public class BlacklistAppeal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "appeal_id")
    private UUID appealId;

    @Column(name = "blacklist_id", nullable = false)
    private UUID blacklistId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    /** PAYMENT_PROOF or APPEAL */
    @Column(name = "appeal_type", nullable = false, length = 50)
    private String appealType;

    @Column(name = "related_invoice_id")
    private UUID relatedInvoiceId;

    @Column(name = "related_request_id")
    private UUID relatedRequestId;

    @Column(name = "amount_paid", precision = 18, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "payment_method", length = 100)
    private String paymentMethod;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    @Column(name = "document_url", length = 500)
    private String documentUrl;

    @Column(name = "content")
    private String content;

    /** PENDING, PAYMENT_VERIFIED, PAYMENT_UNVERIFIED, APPROVED, REJECTED, MORE_INFO_REQUESTED */
    @Column(nullable = false, length = 50)
    private String status = "PENDING";

    @Column(name = "reviewer_id")
    private UUID reviewerId;

    @Column(name = "review_notes")
    private String reviewNotes;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneOffset.UTC);
        }
    }
}
