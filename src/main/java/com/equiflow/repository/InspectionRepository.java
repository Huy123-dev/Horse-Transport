package com.equiflow.repository;

import com.equiflow.entity.Inspection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface InspectionRepository extends JpaRepository<Inspection, UUID> {
    List<Inspection> findAllByOrderByUpdatedAtDesc();
    List<Inspection> findByRequestIdOrderByUpdatedAtDesc(UUID requestId);
    List<Inspection> findByRequestIdInOrderByUpdatedAtDesc(Collection<UUID> requestIds);
    boolean existsByRequestIdAndStatus(UUID requestId, String status);
    boolean existsByRequestIdAndStatusNot(UUID requestId, String status);
}
