-- EQUIDELI: PREVENT DUPLICATE HORSE TRANSPORT ORDERS & DATABASE SYNCHRONIZATION
-- Migration: 20261113_horse_transport_reservations.sql

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

    -- Unique filtered index: Exactly one ACTIVE reservation per horse at any time
    CREATE UNIQUE INDEX UQ_active_horse_reservation
    ON dbo.horse_transport_reservations (horse_id)
    WHERE status = 'ACTIVE';

    CREATE INDEX IX_htr_request_id ON dbo.horse_transport_reservations (request_id);
    CREATE INDEX IX_htr_horse_status ON dbo.horse_transport_reservations (horse_id, status);
END;

-- Sync existing horse-request relationships into reservations
-- 1. Identify completed, rejected, cancelled requests -> RELEASED
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
);

-- 2. Identify active requests -> ACTIVE (one per horse)
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
);
