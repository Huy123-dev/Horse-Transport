package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "transport_requests")
@Getter
@Setter
public class TransportRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "request_id")
    private UUID requestId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "origin_location_id", nullable = false)
    private UUID originLocationId;

    @Column(name = "destination_location_id", nullable = false)
    private UUID destinationLocationId;

    @Column(name = "scheduled_departure_date", nullable = false)
    private LocalDate scheduledDepartureDate;

    @Column(name = "scheduled_arrival_date", nullable = false)
    private LocalDate scheduledArrivalDate;

    @Column(name = "special_requirements")
    private String specialRequirements;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "estimated_amount", precision = 12, scale = 2)
    private BigDecimal estimatedAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "specialist_approved_by")
    private UUID specialistApprovedBy;

    @Column(name = "specialist_approved_at")
    private LocalDateTime specialistApprovedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    /** Bảng liên kết N-N transport_request_horses (request_id, horse_id) */
    @ElementCollection
    @CollectionTable(name = "transport_request_horses", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "horse_id", nullable = false)
    @BatchSize(size = 50)
    private Set<UUID> horseIds = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
