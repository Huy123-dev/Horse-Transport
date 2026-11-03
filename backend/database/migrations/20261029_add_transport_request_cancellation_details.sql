IF COL_LENGTH('dbo.transport_requests', 'cancelled_by') IS NULL
    ALTER TABLE dbo.transport_requests ADD cancelled_by UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('dbo.transport_requests', 'cancelled_at') IS NULL
    ALTER TABLE dbo.transport_requests ADD cancelled_at DATETIME2 NULL;
GO

IF COL_LENGTH('dbo.transport_requests', 'cancellation_reason') IS NULL
    ALTER TABLE dbo.transport_requests ADD cancellation_reason NVARCHAR(500) NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_transport_requests_cancelled_by'
      AND parent_object_id = OBJECT_ID('dbo.transport_requests')
)
    ALTER TABLE dbo.transport_requests
        ADD CONSTRAINT FK_transport_requests_cancelled_by
        FOREIGN KEY (cancelled_by) REFERENCES dbo.users(user_id);
GO
