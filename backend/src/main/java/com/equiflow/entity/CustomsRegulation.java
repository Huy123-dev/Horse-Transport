package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "customs_regulations")
@Getter
@Setter
public class CustomsRegulation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "regulation_id")
    private UUID regulationId;

    @Column(name = "country_code", nullable = false, length = 3)
    private String countryCode;

    /** Cảng/sân bay áp dụng (một dòng trong locations), có thể để trống. */
    @Column(name = "port_location_id")
    private UUID portLocationId;

    @Column(name = "quarantine_standard")
    private String quarantineStandard;

    @Column(name = "required_documents")
    private String requiredDocuments;

    /** IMPORT | EXPORT (có CHECK trong DB) */
    @Column(name = "import_export_type", nullable = false, length = 10)
    private String importExportType;
}
