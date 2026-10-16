package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "horses")
@Getter
@Setter
public class Horse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "horse_id")
    private UUID horseId;

    @Column(name = "microchip_id", nullable = false, unique = true, length = 50)
    private String microchipId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "pedigree")
    private String pedigree;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(name = "medical_history")
    private String medicalHistory;

    @Column(name = "allergies")
    private String allergies;

    @Column(name = "temperament")
    private String temperament;

    @Column(nullable = false, length = 10)
    private String gender;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
