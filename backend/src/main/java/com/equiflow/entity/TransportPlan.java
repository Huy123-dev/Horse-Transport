package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transport_plans")
@Getter
@Setter
public class TransportPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "plan_id")
    private UUID planId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    /** Mô tả lộ trình, dữ liệu mẫu dùng chuỗi JSON: {"route":["NRT","HKG"]} */
    @Column(name = "route_details")
    private String routeDetails;

    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;

    @Column(name = "arrival_time", nullable = false)
    private LocalDateTime arrivalTime;

    @Column(nullable = false, length = 50)
    private String status;

    /** Fleet & Route Coordinator phụ trách kế hoạch. */
    @Column(name = "coordinator_id")
    private UUID coordinatorId;
}
