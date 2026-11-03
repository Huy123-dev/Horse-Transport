-- Migration: Tạo bảng service_feedbacks cho đánh giá chất lượng dịch vụ của khách hàng
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'service_feedbacks')
BEGIN
    CREATE TABLE dbo.service_feedbacks (
        feedback_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        request_id UNIQUEIDENTIFIER NOT NULL,
        customer_id UNIQUEIDENTIFIER NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        transport_quality INT NULL CHECK (transport_quality >= 1 AND transport_quality <= 5),
        horse_care INT NULL CHECK (horse_care >= 1 AND horse_care <= 5),
        tracking_updates INT NULL CHECK (tracking_updates >= 1 AND tracking_updates <= 5),
        punctuality INT NULL CHECK (punctuality >= 1 AND punctuality <= 5),
        comments NVARCHAR(1000) NULL,
        photo_url NVARCHAR(512) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_service_feedbacks_request UNIQUE (request_id),
        CONSTRAINT FK_service_feedbacks_request FOREIGN KEY (request_id) REFERENCES dbo.transport_requests(request_id) ON DELETE CASCADE,
        CONSTRAINT FK_service_feedbacks_customer FOREIGN KEY (customer_id) REFERENCES dbo.users(user_id)
    );

    CREATE INDEX IX_service_feedbacks_customer ON dbo.service_feedbacks(customer_id);
    CREATE INDEX IX_service_feedbacks_rating ON dbo.service_feedbacks(rating);
END
