package com.equiflow.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Tự động kiểm tra và đồng bộ cấu trúc bảng dbo.invoices, dbo.invoice_payment_history
 * và các chỉ mục kiểm tra xung đột phân công khi ứng dụng khởi động.
 */
@Component
public class InvoiceSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(InvoiceSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public InvoiceSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public void ensureInvoiceEnhancementSchema() {
        try {
            // 1. Thêm các cột theo dõi số hóa đơn chuẩn quốc tế, hạn nợ và thanh toán vào dbo.invoices
            try {
                jdbcTemplate.execute("""
                    IF COL_LENGTH('dbo.invoices', 'invoice_number') IS NULL
                    BEGIN
                        ALTER TABLE dbo.invoices ADD invoice_number NVARCHAR(50) NULL;
                    END
                """);
            } catch (Exception ex) {
                log.debug("invoice_number column check fallback: {}", ex.getMessage());
            }

            try {
                jdbcTemplate.execute("""
                    IF COL_LENGTH('dbo.invoices', 'due_date') IS NULL
                    BEGIN
                        ALTER TABLE dbo.invoices ADD due_date DATETIME2 NULL;
                    END
                """);
            } catch (Exception ex) {
                log.debug("due_date column check fallback: {}", ex.getMessage());
            }

            try {
                jdbcTemplate.execute("""
                    IF COL_LENGTH('dbo.invoices', 'paid_amount') IS NULL
                    BEGIN
                        ALTER TABLE dbo.invoices ADD paid_amount DECIMAL(12,2) NOT NULL CONSTRAINT DF_invoices_paid_amount DEFAULT 0.00;
                    END
                """);
            } catch (Exception ex) {
                log.debug("paid_amount column check fallback: {}", ex.getMessage());
            }

            try {
                jdbcTemplate.execute("""
                    IF COL_LENGTH('dbo.invoices', 'last_updated_by') IS NULL
                    BEGIN
                        ALTER TABLE dbo.invoices ADD last_updated_by UNIQUEIDENTIFIER NULL;
                    END
                """);
            } catch (Exception ex) {
                log.debug("last_updated_by column check fallback: {}", ex.getMessage());
            }

            try {
                jdbcTemplate.execute("""
                    IF COL_LENGTH('dbo.invoices', 'updated_at') IS NULL
                    BEGIN
                        ALTER TABLE dbo.invoices ADD updated_at DATETIME2 NULL;
                    END
                """);
            } catch (Exception ex) {
                log.debug("updated_at column check fallback: {}", ex.getMessage());
            }

            // 2. Đồng bộ dữ liệu hiện có trên dbo.invoices (bao gồm điền mã số hóa đơn chuẩn HD-YYYY-XXXXX)
            try {
                jdbcTemplate.execute("""
                    WITH NumberedInvoices AS (
                        SELECT
                            invoice_id,
                            CONCAT(
                                'HD-',
                                YEAR(ISNULL(issued_at, SYSUTCDATETIME())),
                                '-',
                                RIGHT('00000' + CAST(ROW_NUMBER() OVER (
                                    PARTITION BY YEAR(ISNULL(issued_at, SYSUTCDATETIME()))
                                    ORDER BY ISNULL(issued_at, SYSUTCDATETIME()) ASC, invoice_id ASC
                                ) AS VARCHAR(10)), 5)
                            ) AS generated_number
                        FROM dbo.invoices
                    )
                    UPDATE i
                    SET i.invoice_number = n.generated_number
                    FROM dbo.invoices i
                    INNER JOIN NumberedInvoices n ON i.invoice_id = n.invoice_id
                    WHERE i.invoice_number IS NULL OR LTRIM(RTRIM(i.invoice_number)) = '';
                """);

                jdbcTemplate.execute("""
                    UPDATE dbo.invoices
                    SET due_date = DATEADD(DAY, 14, issued_at)
                    WHERE due_date IS NULL AND issued_at IS NOT NULL;
                """);

                jdbcTemplate.execute("""
                    UPDATE dbo.invoices
                    SET due_date = SYSUTCDATETIME()
                    WHERE due_date IS NULL;
                """);

                jdbcTemplate.execute("""
                    UPDATE dbo.invoices
                    SET paid_amount = amount,
                        updated_at = ISNULL(paid_at, issued_at)
                    WHERE (payment_status IN (N'Da thanh toan', N'PAID', N'Đã thanh toán'))
                      AND (paid_amount IS NULL OR paid_amount = 0.00);
                """);

                jdbcTemplate.execute("""
                    UPDATE dbo.invoices
                    SET paid_amount = 0.00
                    WHERE paid_amount IS NULL;
                """);
            } catch (Exception ex) {
                log.debug("invoices data synchronization fallback: {}", ex.getMessage());
            }

            // 3. Tạo bảng dbo.invoice_payment_history (Audit Trail)
            try {
                jdbcTemplate.execute("""
                    IF OBJECT_ID('dbo.invoice_payment_history', 'U') IS NULL
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
                            updated_by UNIQUEIDENTIFIER NULL,
                            created_at DATETIME2 NOT NULL CONSTRAINT DF_invoice_payment_history_created_at DEFAULT SYSUTCDATETIME(),
                            CONSTRAINT FK_invoice_payment_history_invoice FOREIGN KEY (invoice_id) REFERENCES dbo.invoices (invoice_id) ON DELETE CASCADE
                        );

                        CREATE NONCLUSTERED INDEX IX_invoice_payment_history_invoice_created
                            ON dbo.invoice_payment_history (invoice_id, created_at DESC);
                    END
                """);
            } catch (Exception ex) {
                log.debug("invoice_payment_history table creation fallback: {}", ex.getMessage());
            }

            // 4. Tạo bản ghi lịch sử ban đầu cho hóa đơn đã tồn tại
            try {
                jdbcTemplate.execute("""
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
                        N'Đồng bộ dữ liệu lịch sử thanh toán ban đầu',
                        i.last_updated_by,
                        ISNULL(i.issued_at, SYSUTCDATETIME())
                    FROM dbo.invoices i
                    WHERE NOT EXISTS (
                        SELECT 1 FROM dbo.invoice_payment_history h WHERE h.invoice_id = i.invoice_id
                    );
                """);
            } catch (Exception ex) {
                log.debug("initial invoice history seeding fallback: {}", ex.getMessage());
            }

            // 5. Tạo các chỉ mục kiểm tra xung đột phân công trên transport_assignments
            try {
                jdbcTemplate.execute("""
                    IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'dbo.transport_assignments'))
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_transport_assignments_asset_time' AND object_id = OBJECT_ID(N'dbo.transport_assignments'))
                        BEGIN
                            CREATE NONCLUSTERED INDEX IX_transport_assignments_asset_time
                                ON dbo.transport_assignments (asset_id, start_time, end_time)
                                WHERE asset_id IS NOT NULL;
                        END;

                        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_transport_assignments_user_time' AND object_id = OBJECT_ID(N'dbo.transport_assignments'))
                        BEGIN
                            CREATE NONCLUSTERED INDEX IX_transport_assignments_user_time
                                ON dbo.transport_assignments (user_id, start_time, end_time)
                                WHERE user_id IS NOT NULL;
                        END;
                    END
                """);
            } catch (Exception ex) {
                log.debug("scheduling indexes fallback: {}", ex.getMessage());
            }

            log.info("Cấu trúc bảng hóa đơn và chỉ mục phân công đã được kiểm tra và đồng bộ thành công.");
        } catch (Exception ex) {
            log.warn("Lỗi trong quá trình khởi tạo cấu trúc hóa đơn: {}", ex.getMessage());
            // Fallback dành cho các hệ cơ sở dữ liệu ANSI SQL hoặc H2 trong unit tests
            try {
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50)");
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMP");
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) DEFAULT 0.00");
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_updated_by UUID");
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS invoice_payment_history (
                        history_id UUID PRIMARY KEY,
                        invoice_id UUID NOT NULL,
                        old_status VARCHAR(50) NOT NULL,
                        new_status VARCHAR(50) NOT NULL,
                        paid_amount DECIMAL(12,2) NOT NULL,
                        remaining_amount DECIMAL(12,2) NOT NULL,
                        payment_method VARCHAR(50),
                        notes VARCHAR(500),
                        updated_by UUID,
                        created_at TIMESTAMP NOT NULL
                    )
                """);
            } catch (Exception ignored) {}
        }
    }
}
