package com.equiflow.repository;

import com.equiflow.entity.TransportRequestQuoteLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransportRequestQuoteLineRepository extends JpaRepository<TransportRequestQuoteLine, UUID> {

    List<TransportRequestQuoteLine> findByQuoteIdOrderByLineOrderAsc(UUID quoteId);
}
