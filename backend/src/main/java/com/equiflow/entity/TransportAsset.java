package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "transport_assets")
@Getter
@Setter
public class TransportAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "asset_id")
    private UUID assetId;

    @Column(nullable = false, length = 100)
    private String name;

    /** Dữ liệu mẫu: AIR_CONTAINER, TRUCK, FLIGHT_SLOT */
    @Column(nullable = false, length = 50)
    private String type;

    /** Sức chứa (số ngựa) */
    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "owner_partner_id")
    private UUID ownerPartnerId;

    @Column(nullable = false, length = 50)
    private String status;
}
