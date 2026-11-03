package com.equiflow.repository;

import com.equiflow.entity.TransportAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransportAssetRepository extends JpaRepository<TransportAsset, UUID> {
    List<TransportAsset> findAllByOrderByNameAsc();
}
