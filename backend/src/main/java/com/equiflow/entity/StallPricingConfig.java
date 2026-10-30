package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "stall_pricing_configs")
@Getter
@Setter
public class StallPricingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "config_id")
    private UUID configId;

    @Column(name = "base_price_small", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePriceSmall;

    @Column(name = "medium_multiplier", nullable = false, precision = 6, scale = 2)
    private BigDecimal mediumMultiplier;

    @Column(name = "large_multiplier", nullable = false, precision = 6, scale = 2)
    private BigDecimal largeMultiplier;

    @Column(name = "extra_large_multiplier", nullable = false, precision = 6, scale = 2)
    private BigDecimal extraLargeMultiplier;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "USD";

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "small_length_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal smallLengthMeters = new BigDecimal("2.30");

    @Column(name = "small_width_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal smallWidthMeters = new BigDecimal("1.00");

    @Column(name = "medium_length_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal mediumLengthMeters = new BigDecimal("2.80");

    @Column(name = "medium_width_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal mediumWidthMeters = new BigDecimal("1.20");

    @Column(name = "large_length_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal largeLengthMeters = new BigDecimal("3.65");

    @Column(name = "large_width_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal largeWidthMeters = new BigDecimal("3.65");

    @Column(name = "extra_large_length_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal extraLargeLengthMeters = new BigDecimal("4.25");

    @Column(name = "extra_large_width_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal extraLargeWidthMeters = new BigDecimal("3.65");

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
