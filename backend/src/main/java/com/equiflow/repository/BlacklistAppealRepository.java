package com.equiflow.repository;

import com.equiflow.entity.BlacklistAppeal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BlacklistAppealRepository extends JpaRepository<BlacklistAppeal, UUID> {

    List<BlacklistAppeal> findByBlacklistIdOrderByCreatedAtDesc(UUID blacklistId);

    List<BlacklistAppeal> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<BlacklistAppeal> findByStatusOrderByCreatedAtDesc(String status);

    List<BlacklistAppeal> findByStatusInOrderByCreatedAtDesc(Collection<String> statuses);

    long countByStatus(String status);

    long countByStatusIn(Collection<String> statuses);
}
