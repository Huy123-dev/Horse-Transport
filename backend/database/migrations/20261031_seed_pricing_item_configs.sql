-- Migration: Seed default USD pricing catalog configs and package inclusions
-- Date: 2026-10-31

IF OBJECT_ID('dbo.pricing_item_configs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.pricing_item_configs (
        item_code NVARCHAR(64) NOT NULL,
        unit_type NVARCHAR(20) NULL,
        unit_price_usd DECIMAL(12, 2) NULL,
        benefits NVARCHAR(2000) NULL,
        required BIT NOT NULL CONSTRAINT DF_pricing_item_configs_required DEFAULT 0,
        updated_by UNIQUEIDENTIFIER NULL,
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_pricing_item_configs_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_pricing_item_configs PRIMARY KEY (item_code),
        CONSTRAINT CK_pricing_item_configs_unit CHECK (unit_type IS NULL OR unit_type IN ('PER_HORSE', 'PER_REQUEST', 'PER_TRIP')),
        CONSTRAINT CK_pricing_item_configs_price CHECK (unit_price_usd IS NULL OR unit_price_usd >= 0),
        CONSTRAINT FK_pricing_item_configs_user FOREIGN KEY (updated_by) REFERENCES dbo.users(user_id)
    );
END;
GO

IF OBJECT_ID('dbo.pricing_package_inclusions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.pricing_package_inclusions (
        package_code NVARCHAR(64) NOT NULL,
        service_code NVARCHAR(64) NOT NULL,
        CONSTRAINT PK_pricing_package_inclusions PRIMARY KEY (package_code, service_code),
        CONSTRAINT CK_pricing_package_inclusions_package CHECK (package_code IN ('BASIC_TRANSPORT', 'STANDARD_TRANSPORT', 'PREMIUM_TRANSPORT')),
        CONSTRAINT CK_pricing_package_inclusions_service CHECK (service_code IN (
            'VETERINARY_SUPPORT', 'CUSTOMS_DOCUMENTATION', 'DEDICATED_STALL', 'SHARED_STALL',
            'INSURANCE', 'GROOM_ESCORT', 'EMERGENCY_TRANSPORT', 'ADDITIONAL_HANDLING')),
        CONSTRAINT FK_pricing_package_inclusions_package FOREIGN KEY (package_code)
            REFERENCES dbo.pricing_item_configs(item_code)
    );
END;
GO

-- Upsert 11 default catalog items
MERGE INTO dbo.pricing_item_configs AS target
USING (VALUES
    ('BASIC_TRANSPORT', 'PER_HORSE', 1500.00, N'Gói vận chuyển cơ bản: Xe chuyên dụng tiêu chuẩn, kiểm tra an toàn trước chuyến đi, theo dõi lộ trình cơ bản.', 1),
    ('STANDARD_TRANSPORT', 'PER_HORSE', 2500.00, N'Gói vận chuyển tiêu chuẩn: Chuồng đệm tiêu chuẩn, bao gồm dịch vụ kiểm dịch hải quan và bác sĩ thú y đồng hành suốt tuyến.', 1),
    ('PREMIUM_TRANSPORT', 'PER_HORSE', 4000.00, N'Gói vận chuyển cao cấp VIP: Khoang chuồng riêng đệm chống sốc, bác sĩ thú y chuyên trách, bảo hiểm trọn gói và hỗ trợ thủ tục hải quan ưu tiên.', 1),
    ('VETERINARY_SUPPORT', 'PER_TRIP', 300.00, N'Bác sĩ thú y giàu kinh nghiệm kiểm tra thể trạng, sơ cứu và theo dõi sức khỏe liên tục trong suốt hành trình.', 0),
    ('CUSTOMS_DOCUMENTATION', 'PER_REQUEST', 200.00, N'Hỗ trợ chuẩn bị và xử lý toàn diện hồ sơ kiểm dịch, chứng nhận tiêm chủng và giấy tờ thông quan hải quan.', 0),
    ('DEDICATED_STALL', 'PER_HORSE', 500.00, N'Khoang chuồng riêng biệt diện tích rộng rãi, trang bị đệm rơm cao cấp chống trượt và chống rung lắc tối đa.', 0),
    ('SHARED_STALL', 'PER_HORSE', 250.00, N'Khoang chuồng đôi có vách ngăn an toàn, lót đệm êm ái và hệ thống thông khí tiêu chuẩn.', 0),
    ('INSURANCE', 'PER_HORSE', 350.00, N'Bảo hiểm rủi ro vận chuyển toàn diện cho ngựa theo giá trị thẩm định trong suốt quá trình giao nhận.', 0),
    ('GROOM_ESCORT', 'PER_TRIP', 400.00, N'Chuyên viên chăm sóc ngựa (groom) đi cùng trên xe, đảm bảo cho ngựa ăn uống, giữ bình tĩnh và vệ sinh sạch sẽ.', 0),
    ('EMERGENCY_TRANSPORT', 'PER_REQUEST', 600.00, N'Dịch vụ vận chuyển khẩn cấp 24/7 với phương tiện ưu tiên và trang thiết bị hỗ trợ hồi sức cấp cứu tại chỗ.', 0),
    ('ADDITIONAL_HANDLING', 'PER_HORSE', 150.00, N'Xử lý và chăm sóc đặc biệt cho ngựa nhạy cảm, ngựa thi đấu hoặc theo yêu cầu hướng dẫn riêng của chủ ngựa.', 0)
) AS source (item_code, unit_type, unit_price_usd, benefits, required)
ON target.item_code = source.item_code
WHEN MATCHED AND (target.unit_price_usd IS NULL OR target.unit_type IS NULL) THEN
    UPDATE SET
        target.unit_type = source.unit_type,
        target.unit_price_usd = source.unit_price_usd,
        target.benefits = source.benefits,
        target.required = source.required,
        target.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (item_code, unit_type, unit_price_usd, benefits, required, updated_at)
    VALUES (source.item_code, source.unit_type, source.unit_price_usd, source.benefits, source.required, SYSUTCDATETIME());
GO

-- Upsert package inclusions
IF NOT EXISTS (SELECT 1 FROM dbo.pricing_package_inclusions WHERE package_code = 'STANDARD_TRANSPORT' AND service_code = 'CUSTOMS_DOCUMENTATION')
    INSERT INTO dbo.pricing_package_inclusions (package_code, service_code) VALUES ('STANDARD_TRANSPORT', 'CUSTOMS_DOCUMENTATION');
IF NOT EXISTS (SELECT 1 FROM dbo.pricing_package_inclusions WHERE package_code = 'STANDARD_TRANSPORT' AND service_code = 'VETERINARY_SUPPORT')
    INSERT INTO dbo.pricing_package_inclusions (package_code, service_code) VALUES ('STANDARD_TRANSPORT', 'VETERINARY_SUPPORT');

IF NOT EXISTS (SELECT 1 FROM dbo.pricing_package_inclusions WHERE package_code = 'PREMIUM_TRANSPORT' AND service_code = 'CUSTOMS_DOCUMENTATION')
    INSERT INTO dbo.pricing_package_inclusions (package_code, service_code) VALUES ('PREMIUM_TRANSPORT', 'CUSTOMS_DOCUMENTATION');
IF NOT EXISTS (SELECT 1 FROM dbo.pricing_package_inclusions WHERE package_code = 'PREMIUM_TRANSPORT' AND service_code = 'VETERINARY_SUPPORT')
    INSERT INTO dbo.pricing_package_inclusions (package_code, service_code) VALUES ('PREMIUM_TRANSPORT', 'VETERINARY_SUPPORT');
IF NOT EXISTS (SELECT 1 FROM dbo.pricing_package_inclusions WHERE package_code = 'PREMIUM_TRANSPORT' AND service_code = 'DEDICATED_STALL')
    INSERT INTO dbo.pricing_package_inclusions (package_code, service_code) VALUES ('PREMIUM_TRANSPORT', 'DEDICATED_STALL');
IF NOT EXISTS (SELECT 1 FROM dbo.pricing_package_inclusions WHERE package_code = 'PREMIUM_TRANSPORT' AND service_code = 'INSURANCE')
    INSERT INTO dbo.pricing_package_inclusions (package_code, service_code) VALUES ('PREMIUM_TRANSPORT', 'INSURANCE');
GO
