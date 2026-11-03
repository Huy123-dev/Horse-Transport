package com.equiflow.repository;

import com.equiflow.entity.TransportRequestStall;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransportRequestStallRepository extends JpaRepository<TransportRequestStall, UUID> {
    List<TransportRequestStall> findByRequestIdOrderByHorseIdAsc(UUID requestId);
}
