package com.equiflow.repository;

import com.equiflow.entity.TransportRequestPricingSelection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransportRequestPricingSelectionRepository
        extends JpaRepository<TransportRequestPricingSelection, UUID> {

    List<TransportRequestPricingSelection> findByRequestId(UUID requestId);

    void deleteByRequestId(UUID requestId);
}
