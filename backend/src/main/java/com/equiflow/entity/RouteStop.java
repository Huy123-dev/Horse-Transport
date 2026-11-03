package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "route_stops")
@Getter
@Setter
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "stop_id")
    private UUID stopId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "sequence_no", nullable = false)
    private Integer sequenceNo;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "stop_name", nullable = false, length = 150)
    private String stopName;

    /** ORIGIN | TRANSIT | CUSTOMS | QUARANTINE | REST | REFUEL | DESTINATION (có CHECK trong DB) */
    @Column(name = "stop_type", nullable = false, length = 50)
    private String stopType;

    @Column(name = "planned_arrival_time")
    private LocalDateTime plannedArrivalTime;

    @Column(name = "planned_departure_time")
    private LocalDateTime plannedDepartureTime;

    @Column(name = "actual_arrival_time")
    private LocalDateTime actualArrivalTime;

    @Column(name = "actual_departure_time")
    private LocalDateTime actualDepartureTime;

    @Column(name = "notes")
    private String notes;
}
