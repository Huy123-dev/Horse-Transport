-- ============================================================================
-- Migration: Bổ sung các trường hồ sơ ngựa (breed, birth_year, weight, height, recovery_days)
-- Ngày tạo: 2026-11-03
-- ============================================================================

USE HorseTransportManagementDB;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.horses') AND name = 'breed'
)
BEGIN
    ALTER TABLE dbo.horses ADD breed NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.horses') AND name = 'birth_year'
)
BEGIN
    ALTER TABLE dbo.horses ADD birth_year INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.horses') AND name = 'weight_kg'
)
BEGIN
    ALTER TABLE dbo.horses ADD weight_kg DECIMAL(6, 2) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.horses') AND name = 'height_cm'
)
BEGIN
    ALTER TABLE dbo.horses ADD height_cm DECIMAL(5, 1) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.horses') AND name = 'recovery_days'
)
BEGIN
    ALTER TABLE dbo.horses ADD recovery_days INT NULL;
END
GO

-- Cập nhật dữ liệu thực tế cho các chú ngựa demo mẫu
UPDATE dbo.horses
SET breed = N'Thoroughbred', birth_year = 2019, weight_kg = 485.5, height_cm = 162.0, recovery_days = 3
WHERE microchip_id = 'MC-0001';

UPDATE dbo.horses
SET breed = N'Thoroughbred', birth_year = 2020, weight_kg = 460.0, height_cm = 158.5, recovery_days = 2
WHERE microchip_id = 'MC-0002';

UPDATE dbo.horses
SET breed = N'Arabian', birth_year = 2018, weight_kg = 510.0, height_cm = 165.0, recovery_days = 5
WHERE microchip_id = 'MC-0003';
GO
