package com.equiflow.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "pricing_item_configs")
@Getter
@Setter
public class PricingItemConfig {

    @Id
    @Column(name = "item_code", length = 64)
    private String itemCode;

    @Column(name = "unit_type", length = 20)
    private String unitType;

    @Column(name = "unit_price_usd", precision = 12, scale = 2)
    private BigDecimal unitPriceUsd;

    @Column(length = 2000)
    private String benefits;

    @Column(nullable = false)
    private boolean required;

    @Column(name = "updated_by")
    private java.util.UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "pricing_package_inclusions", joinColumns = @JoinColumn(name = "package_code"))
    @Column(name = "service_code", nullable = false, length = 64)
    private Set<String> includedServiceCodes = new LinkedHashSet<>();
}
