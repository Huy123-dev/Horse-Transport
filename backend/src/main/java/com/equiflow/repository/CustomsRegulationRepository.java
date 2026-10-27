package com.equiflow.repository;

import com.equiflow.entity.CustomsRegulation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CustomsRegulationRepository extends JpaRepository<CustomsRegulation, UUID> {
    List<CustomsRegulation> findAllByOrderByCountryCodeAscImportExportTypeAsc();
    List<CustomsRegulation> findByCountryCodeOrderByImportExportTypeAsc(String countryCode);
}
