package com.equiflow.repository;

import com.equiflow.entity.InvoicePaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvoicePaymentHistoryRepository extends JpaRepository<InvoicePaymentHistory, UUID> {

    List<InvoicePaymentHistory> findByInvoiceIdOrderByCreatedAtDesc(UUID invoiceId);
}
