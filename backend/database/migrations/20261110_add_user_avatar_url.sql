-- Migration: Thêm cột avatar_url vào bảng users
-- Ngày tạo: 2026-11-08

IF COL_LENGTH('dbo.users', 'avatar_url') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD avatar_url NVARCHAR(500) NULL;
END;
GO
