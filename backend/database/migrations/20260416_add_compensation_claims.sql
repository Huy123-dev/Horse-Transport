IF OBJECT_ID('dbo.compensation_claims', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.compensation_claims (
        claim_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_compensation_claims_id DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        description NVARCHAR(4000) NOT NULL,
        requested_amount DECIMAL(12, 2) NULL,
        evidence_url NVARCHAR(512) NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_compensation_claims_status DEFAULT 'SUBMITTED',
        decision_note NVARCHAR(2000) NULL,
        submitted_at DATETIME2 NOT NULL
            CONSTRAINT DF_compensation_claims_submitted_at DEFAULT SYSUTCDATETIME(),
        reviewed_at DATETIME2 NULL,
        reviewed_by UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_compensation_claims PRIMARY KEY (claim_id),
        CONSTRAINT FK_compensation_claims_request FOREIGN KEY (request_id)
            REFERENCES dbo.transport_requests(request_id),
        CONSTRAINT FK_compensation_claims_customer FOREIGN KEY (customer_id)
            REFERENCES dbo.users(user_id),
        CONSTRAINT FK_compensation_claims_reviewer FOREIGN KEY (reviewed_by)
            REFERENCES dbo.users(user_id),
        CONSTRAINT CK_compensation_claims_status CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
        CONSTRAINT CK_compensation_claims_amount CHECK (requested_amount IS NULL OR requested_amount > 0)
    );
END;
GO
