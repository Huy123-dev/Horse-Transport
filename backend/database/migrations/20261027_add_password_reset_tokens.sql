IF OBJECT_ID('dbo.password_reset_tokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.password_reset_tokens (
        reset_token_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_password_reset_tokens_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token_hash NVARCHAR(64) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        used_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_password_reset_tokens_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_password_reset_tokens PRIMARY KEY (reset_token_id),
        CONSTRAINT UQ_password_reset_tokens_hash UNIQUE (token_hash),
        CONSTRAINT FK_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
    );

    CREATE INDEX IX_password_reset_tokens_user_created
        ON dbo.password_reset_tokens(user_id, created_at DESC);
END;
GO
