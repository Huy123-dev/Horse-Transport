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

IF OBJECT_ID('dbo.transport_request_pricing_selections', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.transport_request_pricing_selections (
        selection_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_request_pricing_selection_id DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        item_code NVARCHAR(64) NOT NULL,
        CONSTRAINT PK_transport_request_pricing_selections PRIMARY KEY (selection_id),
        CONSTRAINT UQ_request_pricing_selection UNIQUE (request_id, item_code),
        CONSTRAINT FK_request_pricing_selection_request FOREIGN KEY (request_id)
            REFERENCES dbo.transport_requests(request_id),
        CONSTRAINT CK_request_pricing_selection_code CHECK (item_code IN (
            'BASIC_TRANSPORT', 'STANDARD_TRANSPORT', 'PREMIUM_TRANSPORT',
            'VETERINARY_SUPPORT', 'CUSTOMS_DOCUMENTATION', 'DEDICATED_STALL', 'SHARED_STALL',
            'INSURANCE', 'GROOM_ESCORT', 'EMERGENCY_TRANSPORT', 'ADDITIONAL_HANDLING'))
    );
END;
GO

IF OBJECT_ID('dbo.transport_request_quotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.transport_request_quotes (
        quote_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_transport_request_quotes_id DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        version INT NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        currency NVARCHAR(3) NOT NULL,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_transport_request_quotes_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_transport_request_quotes PRIMARY KEY (quote_id),
        CONSTRAINT UQ_transport_request_quote_version UNIQUE (request_id, version),
        CONSTRAINT FK_transport_request_quotes_request FOREIGN KEY (request_id)
            REFERENCES dbo.transport_requests(request_id),
        CONSTRAINT FK_transport_request_quotes_user FOREIGN KEY (created_by) REFERENCES dbo.users(user_id),
        CONSTRAINT CK_transport_request_quotes_total CHECK (total_amount >= 0),
        CONSTRAINT CK_transport_request_quotes_currency CHECK (currency = 'USD')
    );
END;
GO

IF OBJECT_ID('dbo.transport_request_quote_lines', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.transport_request_quote_lines (
        quote_line_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_transport_request_quote_lines_id DEFAULT NEWID(),
        quote_id UNIQUEIDENTIFIER NOT NULL,
        item_code NVARCHAR(64) NOT NULL,
        item_name_snapshot NVARCHAR(120) NOT NULL,
        category_snapshot NVARCHAR(20) NOT NULL,
        benefits_snapshot NVARCHAR(2000) NULL,
        unit_type NVARCHAR(20) NULL,
        quantity INT NULL,
        unit_price_usd DECIMAL(12, 2) NULL,
        line_total_usd DECIMAL(12, 2) NOT NULL,
        required BIT NOT NULL,
        included_in_package BIT NOT NULL,
        line_order INT NOT NULL,
        CONSTRAINT PK_transport_request_quote_lines PRIMARY KEY (quote_line_id),
        CONSTRAINT FK_transport_request_quote_lines_quote FOREIGN KEY (quote_id)
            REFERENCES dbo.transport_request_quotes(quote_id),
        CONSTRAINT CK_transport_request_quote_lines_total CHECK (line_total_usd >= 0),
        CONSTRAINT CK_transport_request_quote_lines_quantity CHECK (quantity IS NULL OR quantity > 0),
        CONSTRAINT CK_transport_request_quote_lines_unit_price CHECK (unit_price_usd IS NULL OR unit_price_usd >= 0),
        CONSTRAINT CK_transport_request_quote_lines_category CHECK (category_snapshot IN ('PACKAGE', 'SERVICE'))
    );
END;
GO
