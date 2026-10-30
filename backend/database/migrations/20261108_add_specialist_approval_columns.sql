-- Migration: Bổ sung các cột phê duyệt 2 cấp cho Transport Specialist và lý do từ chối
IF COL_LENGTH('dbo.transport_requests', 'specialist_approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.transport_requests ADD specialist_approved_by UNIQUEIDENTIFIER NULL;
END
GO

IF COL_LENGTH('dbo.transport_requests', 'specialist_approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.transport_requests ADD specialist_approved_at DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.transport_requests', 'rejection_reason') IS NULL
BEGIN
    ALTER TABLE dbo.transport_requests ADD rejection_reason NVARCHAR(500) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_transport_requests_specialist_approved_by'
      AND parent_object_id = OBJECT_ID('dbo.transport_requests')
)
BEGIN
    ALTER TABLE dbo.transport_requests
        ADD CONSTRAINT FK_transport_requests_specialist_approved_by
        FOREIGN KEY (specialist_approved_by) REFERENCES dbo.users(user_id);
END
GO
