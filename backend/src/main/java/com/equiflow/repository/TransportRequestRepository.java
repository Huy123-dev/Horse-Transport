package com.equiflow.repository;

import com.equiflow.entity.TransportRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransportRequestRepository extends JpaRepository<TransportRequest, UUID> {

    List<TransportRequest> findAllByOrderByCreatedAtDesc();

    List<TransportRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<TransportRequest> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<TransportRequest> findByCustomerIdAndStatusOrderByCreatedAtDesc(UUID customerId, String status);

    long count();

    /** Khóa dòng khi duyệt/từ chối để 2 manager bấm cùng lúc không xử lý trùng một yêu cầu. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from TransportRequest r where r.requestId = :id")
    Optional<TransportRequest> findByIdForUpdate(@Param("id") UUID id);
}
