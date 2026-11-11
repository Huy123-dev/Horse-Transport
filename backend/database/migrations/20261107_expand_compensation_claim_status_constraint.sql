-- Migration: Mở rộng CHECK constraint cho status của compensation_claims
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_compensation_claims_status')
BEGIN
    ALTER TABLE dbo.compensation_claims DROP CONSTRAINT CK_compensation_claims_status;
END
GO

ALTER TABLE dbo.compensation_claims ADD CONSTRAINT CK_compensation_claims_status
    CHECK (status IN ('SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'UNDER_REVIEW', 'NEED_INFO', 'RESOLVED', 'CLOSED'));
GO
