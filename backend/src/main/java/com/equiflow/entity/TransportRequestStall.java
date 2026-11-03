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

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(
        name = "transport_request_stalls",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_transport_request_stalls_request_horse",
                columnNames = {"request_id", "horse_id"}))
@Getter
@Setter
public class TransportRequestStall {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "stall_configuration_id")
    private UUID stallConfigurationId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "horse_id", nullable = false)
    private UUID horseId;

    @Column(name = "stall_size", nullable = false, length = 20)
    private String size;

    @Column(name = "length_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal lengthMeters;

    @Column(name = "width_meters", nullable = false, precision = 6, scale = 2)
    private BigDecimal widthMeters;
}
