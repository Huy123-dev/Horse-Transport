package com.equiflow.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Initializes and synchronizes horse transport reservations on application startup.
 * Ensures the table and unique filtered index exist and syncs existing requests idempotently.
 */
@Component
public class HorseReservationSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(HorseReservationSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public HorseReservationSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureReservationSchemaAndData() {
        try {
            // 1. Create table if not exists (SQL Server & generic SQL compatible)
            try {
                jdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.horse_transport_reservations', 'U') IS NULL
                    BEGIN
                        CREATE TABLE dbo.horse_transport_reservations (
                            reservation_id  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_horse_transport_reservations PRIMARY KEY DEFAULT NEWID(),
                            horse_id        UNIQUEIDENTIFIER NOT NULL,
                            request_id      UNIQUEIDENTIFIER NOT NULL,
                            status          VARCHAR(30)      NOT NULL CONSTRAINT DF_htr_status DEFAULT 'ACTIVE',
                            reserved_at     DATETIME2        NOT NULL CONSTRAINT DF_htr_reserved_at DEFAULT SYSUTCDATETIME(),
                            released_at     DATETIME2        NULL,
                            release_reason  NVARCHAR(200)    NULL,
                            CONSTRAINT FK_htr_horse FOREIGN KEY (horse_id) REFERENCES dbo.horses (horse_id),
                            CONSTRAINT FK_htr_request FOREIGN KEY (request_id) REFERENCES dbo.transport_requests (request_id)
                        );

                        CREATE UNIQUE INDEX UQ_active_horse_reservation
                        ON dbo.horse_transport_reservations (horse_id)
                        WHERE status = 'ACTIVE';

                        CREATE INDEX IX_htr_request_id ON dbo.horse_transport_reservations (request_id);
                        CREATE INDEX IX_htr_horse_status ON dbo.horse_transport_reservations (horse_id, status);
                    END
                """);
            } catch (Exception ex) {
                // Fallback for H2 or standard SQL
                try {
                    jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS horse_transport_reservations (
                            reservation_id UUID PRIMARY KEY,
                            horse_id UUID NOT NULL,
                            request_id UUID NOT NULL,
                            status VARCHAR(30) NOT NULL,
                            reserved_at TIMESTAMP NOT NULL,
                            released_at TIMESTAMP,
                            release_reason VARCHAR(200)
                        )
                    """);
                    try {
                        jdbcTemplate.execute("""
                            CREATE UNIQUE INDEX IF NOT EXISTS UQ_active_horse_reservation
                            ON horse_transport_reservations (horse_id)
                            WHERE status = 'ACTIVE'
                        """);
                    } catch (Exception ignored) {}
                } catch (Exception ignored) {}
            }

            // 2. Synchronize existing data: released for completed/cancelled/rejected requests
            try {
                jdbcTemplate.execute("""
                    INSERT INTO horse_transport_reservations (reservation_id, horse_id, request_id, status, reserved_at, released_at, release_reason)
                    SELECT 
                        RANDOM_UUID(),
                        trh.horse_id,
                        trh.request_id,
                        'RELEASED',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP,
                        CASE 
                            WHEN tr.status IN ('Tu choi', 'REJECTED') THEN 'REJECTED'
                            WHEN tr.status IN ('Da huy', 'CANCELLED') THEN 'CANCELLED'
                            ELSE 'COMPLETED'
                        END
                    FROM transport_request_horses trh
                    INNER JOIN transport_requests tr ON trh.request_id = tr.request_id
                    LEFT JOIN transport_plans tp ON tp.request_id = tr.request_id
                    WHERE NOT EXISTS (
                        SELECT 1 FROM horse_transport_reservations r 
                        WHERE r.horse_id = trh.horse_id AND r.request_id = trh.request_id
                    )
                    AND (
                        tr.status IN ('Tu choi', 'REJECTED', 'Da huy', 'CANCELLED', 'Hoan thanh', 'COMPLETED')
                        OR tp.status IN ('Hoan thanh', 'COMPLETED')
                    )
                """);
            } catch (Exception ex) {
                // SQL Server version with NEWID() and SYSUTCDATETIME()
                try {
                    jdbcTemplate.execute("""
                        INSERT INTO dbo.horse_transport_reservations (reservation_id, horse_id, request_id, status, reserved_at, released_at, release_reason)
                        SELECT 
                            NEWID(),
                            trh.horse_id,
                            trh.request_id,
                            'RELEASED',
                            tr.created_at,
                            ISNULL(tr.updated_at, SYSUTCDATETIME()),
                            CASE 
                                WHEN tr.status IN ('Tu choi', 'REJECTED') THEN 'REJECTED'
                                WHEN tr.status IN ('Da huy', 'CANCELLED') THEN 'CANCELLED'
                                ELSE 'COMPLETED'
                            END
                        FROM dbo.transport_request_horses trh
                        INNER JOIN dbo.transport_requests tr ON trh.request_id = tr.request_id
                        LEFT JOIN dbo.transport_plans tp ON tp.request_id = tr.request_id
                        WHERE NOT EXISTS (
                            SELECT 1 FROM dbo.horse_transport_reservations r 
                            WHERE r.horse_id = trh.horse_id AND r.request_id = trh.request_id
                        )
                        AND (
                            tr.status IN ('Tu choi', 'REJECTED', 'Da huy', 'CANCELLED', 'Hoan thanh', 'COMPLETED')
                            OR tp.status IN ('Hoan thanh', 'COMPLETED')
                        )
                    """);
                } catch (Exception ignored) {}
            }

            // 3. Synchronize active requests -> ACTIVE (one per horse)
            try {
                jdbcTemplate.execute("""
                    INSERT INTO horse_transport_reservations (reservation_id, horse_id, request_id, status, reserved_at, released_at, release_reason)
                    SELECT 
                        RANDOM_UUID(),
                        trh.horse_id,
                        trh.request_id,
                        'ACTIVE',
                        CURRENT_TIMESTAMP,
                        NULL,
                        NULL
                    FROM transport_request_horses trh
                    INNER JOIN transport_requests tr ON trh.request_id = tr.request_id
                    LEFT JOIN transport_plans tp ON tp.request_id = tr.request_id
                    WHERE NOT EXISTS (
                        SELECT 1 FROM horse_transport_reservations r 
                        WHERE r.horse_id = trh.horse_id AND r.request_id = trh.request_id
                    )
                    AND tr.status NOT IN ('Tu choi', 'REJECTED', 'Da huy', 'CANCELLED', 'Hoan thanh', 'COMPLETED')
                    AND (tp.status IS NULL OR tp.status NOT IN ('Hoan thanh', 'COMPLETED'))
                    AND NOT EXISTS (
                        SELECT 1 FROM horse_transport_reservations r2
                        WHERE r2.horse_id = trh.horse_id AND r2.status = 'ACTIVE'
                    )
                """);
            } catch (Exception ex) {
                try {
                    jdbcTemplate.execute("""
                        INSERT INTO dbo.horse_transport_reservations (reservation_id, horse_id, request_id, status, reserved_at, released_at, release_reason)
                        SELECT 
                            NEWID(),
                            trh.horse_id,
                            trh.request_id,
                            'ACTIVE',
                            tr.created_at,
                            NULL,
                            NULL
                        FROM dbo.transport_request_horses trh
                        INNER JOIN dbo.transport_requests tr ON trh.request_id = tr.request_id
                        LEFT JOIN dbo.transport_plans tp ON tp.request_id = tr.request_id
                        WHERE NOT EXISTS (
                            SELECT 1 FROM dbo.horse_transport_reservations r 
                            WHERE r.horse_id = trh.horse_id AND r.request_id = trh.request_id
                        )
                        AND tr.status NOT IN ('Tu choi', 'REJECTED', 'Da huy', 'CANCELLED', 'Hoan thanh', 'COMPLETED')
                        AND (tp.status IS NULL OR tp.status NOT IN ('Hoan thanh', 'COMPLETED'))
                        AND NOT EXISTS (
                            SELECT 1 FROM dbo.horse_transport_reservations r2
                            WHERE r2.horse_id = trh.horse_id AND r2.status = 'ACTIVE'
                        )
                    """);
                } catch (Exception ignored) {}
            }

            log.info("Khởi tạo và đồng bộ bảng horse_transport_reservations hoàn tất.");
        } catch (Exception ex) {
            log.warn("Không thể hoàn tất khởi tạo bảng horse_transport_reservations: {}", ex.getMessage());
        }
    }
}
