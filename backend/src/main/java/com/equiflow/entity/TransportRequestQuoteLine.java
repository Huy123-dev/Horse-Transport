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
import java.util.UUID;

@Entity
@Table(name = "transport_request_quote_lines")
@Getter
@Setter
public class TransportRequestQuoteLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "quote_line_id")
    private UUID quoteLineId;

    @Column(name = "quote_id", nullable = false)
    private UUID quoteId;

    @Column(name = "item_code", nullable = false, length = 64)
    private String itemCode;

    @Column(name = "item_name_snapshot", nullable = false, length = 120)
    private String itemNameSnapshot;

    @Column(name = "category_snapshot", nullable = false, length = 20)
    private String categorySnapshot;

    @Column(name = "benefits_snapshot", length = 2000)
    private String benefitsSnapshot;

    @Column(name = "unit_type", length = 20)
    private String unitType;

    @Column
    private Integer quantity;

    @Column(name = "unit_price_usd", precision = 12, scale = 2)
    private BigDecimal unitPriceUsd;

    @Column(name = "line_total_usd", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotalUsd;

    @Column(nullable = false)
    private boolean required;

    @Column(name = "included_in_package", nullable = false)
    private boolean includedInPackage;

    @Column(name = "line_order", nullable = false)
    private int lineOrder;
}
