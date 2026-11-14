IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.compensation_claims')
      AND name = 'invoice_adjusted'
)
BEGIN
    ALTER TABLE dbo.compensation_claims
        ADD invoice_adjusted BIT NOT NULL
            CONSTRAINT DF_compensation_claims_invoice_adjusted DEFAULT 0;
END;
