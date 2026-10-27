IF OBJECT_ID('dbo.transport_request_stalls', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.transport_request_stalls (
        stall_configuration_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_transport_request_stalls_id DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        horse_id UNIQUEIDENTIFIER NOT NULL,
        stall_size NVARCHAR(20) NOT NULL,
        length_meters DECIMAL(6, 2) NOT NULL,
        width_meters DECIMAL(6, 2) NOT NULL,
        CONSTRAINT PK_transport_request_stalls PRIMARY KEY (stall_configuration_id),
        CONSTRAINT UQ_transport_request_stalls_request_horse UNIQUE (request_id, horse_id),
        CONSTRAINT FK_transport_request_stalls_request FOREIGN KEY (request_id)
            REFERENCES dbo.transport_requests(request_id),
        CONSTRAINT FK_transport_request_stalls_horse FOREIGN KEY (horse_id)
            REFERENCES dbo.horses(horse_id),
        CONSTRAINT CK_transport_request_stalls_size CHECK
            (stall_size IN ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'CUSTOM')),
        CONSTRAINT CK_transport_request_stalls_dimensions CHECK
            (length_meters > 0 AND width_meters > 0)
    );
END;
GO
