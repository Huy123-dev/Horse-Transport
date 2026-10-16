package com.equiflow.repository;

import com.equiflow.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findAllByOrderByIssuedAtDesc();

    List<Invoice> findByRequestIdInOrderByIssuedAtDesc(Collection<UUID> requestIds);

    Optional<Invoice> findFirstByRequestIdOrderByIssuedAtDesc(UUID requestId);

    boolean existsByRequestId(UUID requestId);
}
