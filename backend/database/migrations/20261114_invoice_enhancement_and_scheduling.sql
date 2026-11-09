-- ============================================================================
-- Migration: 20261114_invoice_enhancement_and_scheduling.sql
-- Description:
-- 1. Bổ sung các cột theo dõi thanh toán và hạn thanh toán vào bảng dbo.invoices.
-- 2. Tạo bảng dbo.invoice_payment_history để lưu vết lịch sử cập nhật thanh toán.
-- 3. Chuẩn hóa dữ liệu lịch sử thanh toán cho các hóa đơn hiện có.
-- 4. Bổ sung index tối ưu truy vấn kiểm tra trùng lịch phân công vận chuyển.
-- ============================================================================

-- 1. Thêm các cột mới vào dbo.invoices nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.invoices') AND name = 'due_date'
)
BEGIN
    ALTER TABLE dbo.invoices ADD due_date DATETIME2 NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.invoices') AND name = 'paid_amount'
)
BEGIN
    ALTER TABLE dbo.invoices ADD paid_amount DECIMAL(12,2) NOT NULL CONSTRAINT DF_invoices_paid_amount DEFAULT 0.00;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.invoices') AND name = 'last_updated_by'
)
BEGIN
    ALTER TABLE dbo.invoices ADD last_updated_by UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.invoices') AND name = 'updated_at'
)
BEGIN
    ALTER TABLE dbo.invoices ADD updated_at DATETIME2 NULL;
END;

-- 2. Đồng bộ dữ liệu hiện có trên dbo.invoices:
-- Cập nhật due_date = issued_at + 14 ngày nếu chưa có
UPDATE dbo.invoices
SET due_date = DATEADD(DAY, 14, issued_at)
WHERE due_date IS NULL;

-- Cập nhật paid_amount cho các hóa đơn đã thanh toán
UPDATE dbo.invoices
SET paid_amount = amount,
    updated_at = ISNULL(paid_at, issued_at)
WHERE (payment_status IN (N'Da thanh toan', N'PAID', N'Đã thanh toán'))
  AND (paid_amount IS NULL OR paid_amount = 0.00);

-- Đảm bảo paid_amount không null
UPDATE dbo.invoices
SET paid_amount = 0.00
WHERE paid_amount IS NULL;

-- 3. Tạo bảng dbo.invoice_payment_history để lưu vết lịch sử cập nhật thanh toán (Audit Log)
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.invoice_payment_history')
)
BEGIN
    CREATE TABLE dbo.invoice_payment_history (
        history_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_invoice_payment_history PRIMARY KEY DEFAULT NEWID(),
        invoice_id UNIQUEIDENTIFIER NOT NULL,
        old_status NVARCHAR(50) NOT NULL,
        new_status NVARCHAR(50) NOT NULL,
        paid_amount DECIMAL(12,2) NOT NULL,
        remaining_amount DECIMAL(12,2) NOT NULL,
        payment_method NVARCHAR(50) NULL,
        notes NVARCHAR(500) NULL,
        updated_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_invoice_payment_history_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_invoice_payment_history_invoice FOREIGN KEY (invoice_id) REFERENCES dbo.invoices (invoice_id) ON DELETE CASCADE,
        CONSTRAINT FK_invoice_payment_history_user FOREIGN KEY (updated_by) REFERENCES dbo.users (user_id)
    );

    CREATE NONCLUSTERED INDEX IX_invoice_payment_history_invoice_created
        ON dbo.invoice_payment_history (invoice_id, created_at DESC);
END;

-- 4. Tạo bản ghi lịch sử ban đầu cho các hóa đơn đã có để bảo toàn dữ liệu
INSERT INTO dbo.invoice_payment_history (
    history_id, invoice_id, old_status, new_status, paid_amount, remaining_amount,
    payment_method, notes, updated_by, created_at
)
SELECT 
    NEWID(),
    i.invoice_id,
    N'Khởi tạo',
    i.payment_status,
    ISNULL(i.paid_amount, 0.00),
    CASE 
        WHEN i.amount >= ISNULL(i.paid_amount, 0.00) THEN i.amount - ISNULL(i.paid_amount, 0.00)
        ELSE 0.00 
    END,
    i.payment_method,
    N'Khởi tạo dữ liệu hóa đơn ban đầu từ hệ thống',
    (SELECT TOP 1 user_id FROM dbo.users WHERE role_id = 'LOGISTICS_MANAGER' ORDER BY created_at ASC),
    ISNULL(i.issued_at, SYSUTCDATETIME())
FROM dbo.invoices i
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.invoice_payment_history h WHERE h.invoice_id = i.invoice_id
)
AND EXISTS (
    SELECT 1 FROM dbo.users WHERE role_id = 'LOGISTICS_MANAGER'
);

-- 5. Tạo index tối ưu truy vấn kiểm tra trùng lịch phân công trên dbo.transport_assignments
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID(N'dbo.transport_assignments') 
      AND name = N'IX_transport_assignments_crew_lookup'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_transport_assignments_crew_lookup
        ON dbo.transport_assignments (plan_id)
        INCLUDE (asset_id, driver_user_id, attendant_user_id, assigned_at);
END;
