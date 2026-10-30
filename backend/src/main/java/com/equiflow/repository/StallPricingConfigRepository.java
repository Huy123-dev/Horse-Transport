package com.equiflow.repository;

import com.equiflow.entity.StallPricingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StallPricingConfigRepository extends JpaRepository<StallPricingConfig, UUID> {
    Optional<StallPricingConfig> findTopByActiveTrueOrderByUpdatedAtDesc();
}
