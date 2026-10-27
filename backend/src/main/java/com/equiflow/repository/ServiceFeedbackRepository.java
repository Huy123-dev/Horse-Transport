package com.equiflow.repository;

import com.equiflow.entity.ServiceFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceFeedbackRepository extends JpaRepository<ServiceFeedback, UUID> {

    Optional<ServiceFeedback> findByRequestId(UUID requestId);

    boolean existsByRequestId(UUID requestId);

    List<ServiceFeedback> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<ServiceFeedback> findAllByOrderByCreatedAtDesc();
}
