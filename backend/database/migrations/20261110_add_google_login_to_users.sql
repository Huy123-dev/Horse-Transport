-- ============================================================================
-- Migration: Hỗ trợ đăng nhập bằng Google
--  1) Thêm cột users.google_id (Google "sub" - định danh cố định của tài khoản Google)
--  2) Cho phép nhiều user không có số điện thoại (tài khoản tạo từ Google chưa có SĐT):
--     SQL Server chỉ cho 1 giá trị NULL trong UNIQUE constraint, nên đổi sang filtered unique index.
-- Ngày tạo: 2026-11-10
-- ============================================================================

SET QUOTED_IDENTIFIER ON;
GO

USE HorseTransportManagementDB;
GO

IF COL_LENGTH('dbo.users', 'google_id') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD google_id VARCHAR(64) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_users_google_id' AND object_id = OBJECT_ID('dbo.users'))
BEGIN
    CREATE UNIQUE INDEX UX_users_google_id
        ON dbo.users (google_id)
        WHERE google_id IS NOT NULL;
END;
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_users_phone_number' AND parent_object_id = OBJECT_ID('dbo.users'))
BEGIN
    ALTER TABLE dbo.users DROP CONSTRAINT UQ_users_phone_number;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_users_phone_number' AND object_id = OBJECT_ID('dbo.users'))
BEGIN
    CREATE UNIQUE INDEX UX_users_phone_number
        ON dbo.users (phone_number)
        WHERE phone_number IS NOT NULL;
END;
GO
