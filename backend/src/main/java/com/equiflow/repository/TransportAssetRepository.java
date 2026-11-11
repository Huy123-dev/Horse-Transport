package com.equiflow.repository;

import com.equiflow.entity.TransportAsset;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransportAssetRepository extends JpaRepository<TransportAsset, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TransportAsset a where a.assetId = :assetId")
    Optional<TransportAsset> findByIdForUpdate(@Param("assetId") UUID assetId);

    List<TransportAsset> findAllByOrderByNameAsc();
}
