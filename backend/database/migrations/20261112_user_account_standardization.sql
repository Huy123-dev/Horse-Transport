-- EQUIDELI: USER ACCOUNT PRESERVATION & ROLE DATA STANDARDIZATION MIGRATION
-- Standardizes user accounts, roles, staff types, and clean formatting without deleting any user or breaking FKs.

-- 1. Ensure all canonical roles exist in roles table
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'CUSTOMER')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('CUSTOMER', N'Khách hàng', N'Khách hàng đặt dịch vụ vận chuyển ngựa');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'LOGISTICS_MANAGER')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('LOGISTICS_MANAGER', N'Quản lý Logistics', N'Quản lý chung quy trình vận tải và xét duyệt');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'TRANSPORT_SPECIALIST')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('TRANSPORT_SPECIALIST', N'Chuyên viên vận tải', N'Chuyên viên thẩm định tuyến đường, pháp lý và chi phí');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'FLEET_COORDINATOR')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('FLEET_COORDINATOR', N'Điều phối đội xe', N'Điều phối phương tiện, tuyến đường và đội ngũ vận hành');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'DRIVER')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('DRIVER', N'Tài xế', N'Tài xế chuyên chở ngựa đua');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'ESCORT')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('ESCORT', N'Nhân viên hộ tống', N'Bác sĩ thú y / Nhân viên chăm sóc ngựa trong chuyến đi');

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'DRIVER_ESCORT')
    INSERT INTO dbo.roles (role_id, role_name, description) VALUES ('DRIVER_ESCORT', N'Đội ngũ vận hành', N'Đội ngũ tài xế và hộ tống trên đường');

-- 2. Migrate any legacy ADMIN user to LOGISTICS_MANAGER
UPDATE dbo.users
SET role_id = 'LOGISTICS_MANAGER',
    updated_at = SYSUTCDATETIME()
WHERE role_id = 'ADMIN';

-- 3. Standardize email: trim and lowercase
UPDATE dbo.users
SET email = LOWER(LTRIM(RTRIM(email))),
    updated_at = SYSUTCDATETIME()
WHERE email IS NOT NULL AND email <> LOWER(LTRIM(RTRIM(email)));

-- 4. Standardize name: trim leading and trailing whitespace
UPDATE dbo.users
SET name = LTRIM(RTRIM(name)),
    updated_at = SYSUTCDATETIME()
WHERE name IS NOT NULL AND name <> LTRIM(RTRIM(name));

-- 5. Standardize phone_number: empty string to NULL, trim spaces
UPDATE dbo.users
SET phone_number = NULL,
    updated_at = SYSUTCDATETIME()
WHERE phone_number IS NOT NULL AND LTRIM(RTRIM(phone_number)) = '';

UPDATE dbo.users
SET phone_number = LTRIM(RTRIM(phone_number)),
    updated_at = SYSUTCDATETIME()
WHERE phone_number IS NOT NULL AND phone_number <> LTRIM(RTRIM(phone_number));

-- 6. Standardize organization_name: empty string to NULL, trim spaces
UPDATE dbo.users
SET organization_name = NULL,
    updated_at = SYSUTCDATETIME()
WHERE organization_name IS NOT NULL AND LTRIM(RTRIM(organization_name)) = '';

UPDATE dbo.users
SET organization_name = LTRIM(RTRIM(organization_name)),
    updated_at = SYSUTCDATETIME()
WHERE organization_name IS NOT NULL AND organization_name <> LTRIM(RTRIM(organization_name));

-- 7. Ensure is_active defaults to 1 (true)
UPDATE dbo.users
SET is_active = 1,
    updated_at = SYSUTCDATETIME()
WHERE is_active IS NULL;

-- 8. Standardize staff_type for Driver & Escort accounts
UPDATE dbo.users
SET staff_type = 'DRIVER',
    updated_at = SYSUTCDATETIME()
WHERE (role_id = 'DRIVER' OR LOWER(email) = 'driver@example.com')
  AND (staff_type IS NULL OR staff_type <> 'DRIVER');

UPDATE dbo.users
SET staff_type = 'ESCORT',
    updated_at = SYSUTCDATETIME()
WHERE (role_id = 'ESCORT' OR LOWER(email) = 'escort.vet@example.com')
  AND (staff_type IS NULL OR staff_type <> 'ESCORT');
