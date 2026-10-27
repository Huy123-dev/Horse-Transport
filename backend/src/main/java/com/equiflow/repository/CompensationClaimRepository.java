package com.equiflow.repository;

import com.equiflow.entity.CompensationClaim;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CompensationClaimRepository extends JpaRepository<CompensationClaim, UUID> {
    List<CompensationClaim> findByRequestIdOrderBySubmittedAtDesc(UUID requestId);
    List<CompensationClaim> findByCustomerIdOrderBySubmittedAtDesc(UUID customerId);
    List<CompensationClaim> findAllByOrderBySubmittedAtDesc();
    boolean existsByRequestIdAndStatus(UUID requestId, String status);
}
