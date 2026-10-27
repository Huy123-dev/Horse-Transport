package com.equiflow.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "transport_request_pricing_selections",
        uniqueConstraints = @UniqueConstraint(name = "UQ_request_pricing_selection",
                columnNames = {"request_id", "item_code"}))
@Getter
@Setter
public class TransportRequestPricingSelection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "selection_id")
    private UUID selectionId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "item_code", nullable = false, length = 64)
    private String itemCode;
}
