-- Migration: Add staff_type to users table and configure demo accounts
-- Date: 2026-11-01

IF COL_LENGTH('dbo.users', 'staff_type') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD staff_type NVARCHAR(20) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_users_staff_type')
BEGIN
    ALTER TABLE dbo.users ADD CONSTRAINT CK_users_staff_type
        CHECK (staff_type IS NULL OR staff_type IN ('DRIVER', 'ESCORT'));
END;
GO

-- Seed staff_type for demo field crew accounts
UPDATE dbo.users
SET staff_type = 'DRIVER'
WHERE email = 'driver@example.com' OR user_id = 'c3000000-0000-0000-0000-000000000003';

UPDATE dbo.users
SET staff_type = 'ESCORT'
WHERE email = 'escort.vet@example.com' OR user_id = 'c3000000-0000-0000-0000-000000000004';
GO
