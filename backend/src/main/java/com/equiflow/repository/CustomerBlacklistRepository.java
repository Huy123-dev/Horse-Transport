package com.equiflow.repository;

import com.equiflow.entity.CustomerBlacklist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerBlacklistRepository extends JpaRepository<CustomerBlacklist, UUID> {

    List<CustomerBlacklist> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    Optional<CustomerBlacklist> findFirstByCustomerIdAndStatusInOrderByCreatedAtDesc(UUID customerId, Collection<String> statuses);

    boolean existsByCustomerIdAndStatusIn(UUID customerId, Collection<String> statuses);

    @Query("SELECT b FROM CustomerBlacklist b WHERE b.status IN :statuses")
    List<CustomerBlacklist> findAllActiveByStatuses(@Param("statuses") Collection<String> statuses);

    long countByStatus(String status);

    long countByReasonInAndStatusIn(Collection<String> reasons, Collection<String> statuses);

    long countByStatusIn(Collection<String> statuses);

    @Query("SELECT b FROM CustomerBlacklist b ORDER BY b.createdAt DESC")
    List<CustomerBlacklist> findAllOrderByCreatedAtDesc();
}
