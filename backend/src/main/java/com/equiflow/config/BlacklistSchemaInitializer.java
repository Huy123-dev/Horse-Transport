package com.equiflow.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class BlacklistSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(BlacklistSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public BlacklistSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBlacklistTablesExist() {
        try {
            jdbcTemplate.execute("""
                IF OBJECT_ID('dbo.customer_blacklist', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.customer_blacklist (
                        blacklist_id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_customer_blacklist_id DEFAULT NEWID(),
                        customer_id         UNIQUEIDENTIFIER NOT NULL,
                        restricted_by_id    UNIQUEIDENTIFIER NOT NULL,
                        restricted_at       DATETIME2        NOT NULL CONSTRAINT DF_customer_blacklist_restricted_at DEFAULT SYSUTCDATETIME(),
                        reason              NVARCHAR(100)    NOT NULL,
                        description         NVARCHAR(MAX)    NULL,
                        related_request_id  UNIQUEIDENTIFIER NULL,
                        related_invoice_id  UNIQUEIDENTIFIER NULL,
                        amount_due          DECIMAL(18,2)    NULL,
                        due_date            DATE             NULL,
                        evidence_url        NVARCHAR(500)    NULL,
                        status              VARCHAR(50)      NOT NULL CONSTRAINT DF_customer_blacklist_status DEFAULT 'RESTRICTED',
                        resolution_notes    NVARCHAR(MAX)    NULL,
                        resolved_by_id      UNIQUEIDENTIFIER NULL,
                        resolved_at         DATETIME2        NULL,
                        reactivated_at      DATETIME2        NULL,
                        created_at          DATETIME2        NOT NULL CONSTRAINT DF_customer_blacklist_created DEFAULT SYSUTCDATETIME(),
                        updated_at          DATETIME2        NOT NULL CONSTRAINT DF_customer_blacklist_updated DEFAULT SYSUTCDATETIME(),
                        CONSTRAINT PK_customer_blacklist PRIMARY KEY (blacklist_id),
                        CONSTRAINT FK_customer_blacklist_customer FOREIGN KEY (customer_id) REFERENCES dbo.users (user_id),
                        CONSTRAINT FK_customer_blacklist_restricted_by FOREIGN KEY (restricted_by_id) REFERENCES dbo.users (user_id)
                    );
                    CREATE INDEX IX_customer_blacklist_customer_id ON dbo.customer_blacklist (customer_id);
                    CREATE INDEX IX_customer_blacklist_status ON dbo.customer_blacklist (status);
                END
            """);

            jdbcTemplate.execute("""
                IF OBJECT_ID('dbo.customer_blacklist_appeals', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.customer_blacklist_appeals (
                        appeal_id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_blacklist_appeals_id DEFAULT NEWID(),
                        blacklist_id        UNIQUEIDENTIFIER NOT NULL,
                        customer_id         UNIQUEIDENTIFIER NOT NULL,
                        appeal_type         VARCHAR(50)      NOT NULL,
                        related_invoice_id  UNIQUEIDENTIFIER NULL,
                        related_request_id  UNIQUEIDENTIFIER NULL,
                        amount_paid         DECIMAL(18,2)    NULL,
                        payment_date        DATE             NULL,
                        payment_method      NVARCHAR(100)    NULL,
                        reference_code      NVARCHAR(100)    NULL,
                        document_url        NVARCHAR(500)    NULL,
                        content             NVARCHAR(MAX)    NULL,
                        status              VARCHAR(50)      NOT NULL CONSTRAINT DF_blacklist_appeals_status DEFAULT 'PENDING',
                        reviewer_id         UNIQUEIDENTIFIER NULL,
                        review_notes        NVARCHAR(MAX)    NULL,
                        reviewed_at         DATETIME2        NULL,
                        created_at          DATETIME2        NOT NULL CONSTRAINT DF_blacklist_appeals_created DEFAULT SYSUTCDATETIME(),
                        CONSTRAINT PK_customer_blacklist_appeals PRIMARY KEY (appeal_id),
                        CONSTRAINT FK_customer_blacklist_appeals_bl FOREIGN KEY (blacklist_id) REFERENCES dbo.customer_blacklist (blacklist_id),
                        CONSTRAINT FK_customer_blacklist_appeals_customer FOREIGN KEY (customer_id) REFERENCES dbo.users (user_id)
                    );
                    CREATE INDEX IX_blacklist_appeals_blacklist_id ON dbo.customer_blacklist_appeals (blacklist_id);
                    CREATE INDEX IX_blacklist_appeals_customer_id ON dbo.customer_blacklist_appeals (customer_id);
                    CREATE INDEX IX_blacklist_appeals_status ON dbo.customer_blacklist_appeals (status);
                END
            """);
            log.info("Blacklist tables verified and ready.");
        } catch (Exception ex) {
            log.debug("Initializing blacklist tables fallback check: {}", ex.getMessage());
        }
    }
}
