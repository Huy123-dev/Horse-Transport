package com.equiflow.repository;

import com.equiflow.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {

    Optional<Delivery> findFirstByPlanIdOrderByDeliveredAtDesc(UUID planId);

    boolean existsByPlanId(UUID planId);
}
