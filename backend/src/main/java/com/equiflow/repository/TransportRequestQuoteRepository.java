package com.equiflow.repository;

import com.equiflow.entity.TransportRequestQuote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TransportRequestQuoteRepository extends JpaRepository<TransportRequestQuote, UUID> {

    Optional<TransportRequestQuote> findTopByRequestIdOrderByVersionDesc(UUID requestId);
}
