-- Migration: Mở rộng bảng compensation_claims với category, severity, currency, approved_amount
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.compensation_claims') AND name = 'category')
BEGIN
    ALTER TABLE dbo.compensation_claims ADD category NVARCHAR(50) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.compensation_claims') AND name = 'severity')
BEGIN
    ALTER TABLE dbo.compensation_claims ADD severity NVARCHAR(20) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.compensation_claims') AND name = 'currency')
BEGIN
    ALTER TABLE dbo.compensation_claims ADD currency VARCHAR(3) NOT NULL CONSTRAINT DF_claims_currency DEFAULT 'USD';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.compensation_claims') AND name = 'approved_amount')
BEGIN
    ALTER TABLE dbo.compensation_claims ADD approved_amount DECIMAL(12,2) NULL;
END
