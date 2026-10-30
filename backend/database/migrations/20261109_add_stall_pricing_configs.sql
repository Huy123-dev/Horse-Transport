-- ============================================================================
-- Migration: Tạo bảng stall_pricing_configs cấu hình giá cơ sở và hệ số chuồng
-- Ngày tạo: 2026-11-09
-- ============================================================================

USE HorseTransportManagementDB;
GO

IF OBJECT_ID('dbo.stall_pricing_configs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.stall_pricing_configs (
        config_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_stall_pricing_configs_id DEFAULT NEWID(),
        base_price_small DECIMAL(12, 2) NOT NULL,
        medium_multiplier DECIMAL(6, 2) NOT NULL,
        large_multiplier DECIMAL(6, 2) NOT NULL,
        extra_large_multiplier DECIMAL(6, 2) NOT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_stall_pricing_currency DEFAULT 'USD',
        is_active BIT NOT NULL CONSTRAINT DF_stall_pricing_active DEFAULT 1,
        small_length_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_sm_l DEFAULT 2.30,
        small_width_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_sm_w DEFAULT 1.00,
        medium_length_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_md_l DEFAULT 2.80,
        medium_width_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_md_w DEFAULT 1.20,
        large_length_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_lg_l DEFAULT 3.65,
        large_width_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_lg_w DEFAULT 3.65,
        extra_large_length_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_xl_l DEFAULT 4.25,
        extra_large_width_meters DECIMAL(6, 2) NOT NULL CONSTRAINT DF_stall_xl_w DEFAULT 3.65,
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_stall_pricing_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_stall_pricing_configs PRIMARY KEY (config_id),
        CONSTRAINT CK_stall_pricing_base CHECK (base_price_small >= 0),
        CONSTRAINT CK_stall_pricing_multipliers CHECK (
            medium_multiplier > 0 AND large_multiplier > 0 AND extra_large_multiplier > 0
        ),
        CONSTRAINT CK_stall_pricing_currency CHECK (currency = 'USD')
    );

    -- Dữ liệu mẫu ban đầu: Small = 100 USD, Medium = 1.5 (150 USD), Large = 2.0 (300 USD), Extra Large = 1.5 (450 USD)
    INSERT INTO dbo.stall_pricing_configs (
        base_price_small, medium_multiplier, large_multiplier, extra_large_multiplier,
        currency, is_active,
        small_length_meters, small_width_meters,
        medium_length_meters, medium_width_meters,
        large_length_meters, large_width_meters,
        extra_large_length_meters, extra_large_width_meters
    ) VALUES (
        100.00, 1.50, 2.00, 1.50,
        'USD', 1,
        2.30, 1.00,
        2.80, 1.20,
        3.65, 3.65,
        4.25, 3.65
    );
END
GO
