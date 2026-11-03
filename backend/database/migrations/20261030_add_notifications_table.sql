IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        notification_id     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_notifications_id DEFAULT NEWID(),
        recipient_user_id    UNIQUEIDENTIFIER NOT NULL,
        type                 VARCHAR(50)      NOT NULL,
        title                NVARCHAR(200)    NOT NULL,
        message              NVARCHAR(MAX)    NULL,
        related_entity_type  VARCHAR(50)      NULL,
        related_entity_id    UNIQUEIDENTIFIER NULL,
        is_read              BIT              NOT NULL CONSTRAINT DF_notifications_is_read DEFAULT 0,
        created_at           DATETIME2        NOT NULL CONSTRAINT DF_notifications_created DEFAULT SYSUTCDATETIME(),
        read_at              DATETIME2        NULL,
        CONSTRAINT PK_notifications PRIMARY KEY (notification_id),
        CONSTRAINT FK_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES dbo.users (user_id),
        CONSTRAINT CK_notifications_type CHECK (type IN ('REQUEST_STATUS','INSPECTION_UPDATE','PLAN_UPDATE','ASSIGNMENT','INCIDENT_SOS','INVOICE','QUARANTINE','SYSTEM'))
    );

    CREATE INDEX IX_notifications_recipient_user_id ON dbo.notifications (recipient_user_id);
    CREATE INDEX IX_notifications_is_read ON dbo.notifications (is_read);
    CREATE INDEX IX_notifications_type ON dbo.notifications (type);
    CREATE INDEX IX_notifications_created_at ON dbo.notifications (created_at);
    CREATE INDEX IX_notifications_related_entity ON dbo.notifications (related_entity_type, related_entity_id);
END;
GO
