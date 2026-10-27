/* ============================================================================
   HorseTransportManagementDB.sql
   Database + 22 bang + PK + FK + Index + du lieu mau
   Cap nhat theo 5 vai tro nghiep vu va 6 luong xu ly (Flow 1-6)
   SQL Server (T-SQL)
   ============================================================================ */

SET NOCOUNT ON;
GO

/* ============================================================================
   1. DATABASE
   ============================================================================ */
IF DB_ID(N'HorseTransportManagementDB') IS NOT NULL
BEGIN
    ALTER DATABASE HorseTransportManagementDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HorseTransportManagementDB;
END
GO

CREATE DATABASE HorseTransportManagementDB;
GO

USE HorseTransportManagementDB;
GO

/* ============================================================================
   2. TABLES (theo thu tu phu thuoc khoa ngoai)
   ============================================================================ */

/* ---------- 2.1 roles ---------- */
CREATE TABLE roles (
    role_id      VARCHAR(50)   NOT NULL,
    role_name    NVARCHAR(100) NOT NULL,
    description  NVARCHAR(MAX) NULL,
    CONSTRAINT PK_roles PRIMARY KEY (role_id)
);
GO

/* ---------- 2.2 partners (khong phu thuoc bang nao) ---------- */
CREATE TABLE partners (
    partner_id     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_partners_id DEFAULT NEWID(),
    name           NVARCHAR(150)    NOT NULL,
    type           NVARCHAR(50)     NOT NULL,
    contract_info  NVARCHAR(MAX)    NULL,
    rate_table     NVARCHAR(MAX)    NULL,
    CONSTRAINT PK_partners PRIMARY KEY (partner_id)
);
GO

/* ---------- 2.3 locations (khong phu thuoc bang nao) ---------- */
CREATE TABLE locations (
    location_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_locations_id DEFAULT NEWID(),
    name           NVARCHAR(150)    NOT NULL,
    type           NVARCHAR(50)     NOT NULL,
    latitude       DECIMAL(9,6)     NOT NULL,
    longitude      DECIMAL(9,6)     NOT NULL,
    capacity       INT              NULL,
    contact_info   NVARCHAR(MAX)    NULL,
    country_code   VARCHAR(3)       NOT NULL,
    CONSTRAINT PK_locations PRIMARY KEY (location_id)
);
GO

/* ---------- 2.4 users (phu thuoc roles) ---------- */
CREATE TABLE users (
    user_id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWID(),
    email              NVARCHAR(255)    NOT NULL,
    password_hash      NVARCHAR(255)    NOT NULL,
    role_id            VARCHAR(50)      NOT NULL,
    name               NVARCHAR(100)    NOT NULL,
    phone_number       VARCHAR(20)      NULL,
    organization_name  NVARCHAR(150)    NULL,
    created_at         DATETIME2        NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    updated_at         DATETIME2        NOT NULL CONSTRAINT DF_users_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_users PRIMARY KEY (user_id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT UQ_users_phone_number UNIQUE (phone_number),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id)
);
GO

/* ---------- 2.5 horses (phu thuoc users) ---------- */
CREATE TABLE horses (
    horse_id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_horses_id DEFAULT NEWID(),
    microchip_id      VARCHAR(50)      NOT NULL,
    name              NVARCHAR(100)    NOT NULL,
    pedigree          NVARCHAR(MAX)    NULL,
    owner_user_id     UNIQUEIDENTIFIER NULL,
    medical_history   NVARCHAR(MAX)    NULL,
    allergies         NVARCHAR(MAX)    NULL,
    temperament       NVARCHAR(MAX)    NULL,
    gender            VARCHAR(10)      NOT NULL,
    created_at        DATETIME2        NOT NULL CONSTRAINT DF_horses_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_horses PRIMARY KEY (horse_id),
    CONSTRAINT UQ_horses_microchip UNIQUE (microchip_id),
    CONSTRAINT FK_horses_owner FOREIGN KEY (owner_user_id) REFERENCES users (user_id)
);
GO

/* ---------- 2.6 transport_assets (phu thuoc partners) ---------- */
CREATE TABLE transport_assets (
    asset_id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_assets_id DEFAULT NEWID(),
    name              NVARCHAR(100)    NOT NULL,
    type              VARCHAR(50)      NOT NULL,
    capacity          INT              NOT NULL,
    owner_partner_id  UNIQUEIDENTIFIER NULL,
    status            NVARCHAR(50)     NOT NULL,
    CONSTRAINT PK_transport_assets PRIMARY KEY (asset_id),
    CONSTRAINT FK_assets_partner FOREIGN KEY (owner_partner_id) REFERENCES partners (partner_id)
);
GO

/* ---------- 2.7 transport_requests (phu thuoc users, locations)
   [CAP NHAT] them approved_by, approved_at de truy vet Logistics Manager
   phe duyet don hang (Flow 1) ---------- */
CREATE TABLE transport_requests (
    request_id                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_requests_id DEFAULT NEWID(),
    customer_id                UNIQUEIDENTIFIER NOT NULL,
    origin_location_id         UNIQUEIDENTIFIER NOT NULL,
    destination_location_id    UNIQUEIDENTIFIER NOT NULL,
    scheduled_departure_date   DATE             NOT NULL,
    scheduled_arrival_date     DATE             NOT NULL,
    special_requirements       NVARCHAR(MAX)    NULL,
    status                     NVARCHAR(50)     NOT NULL,
    estimated_amount           DECIMAL(12,2)    NULL,
    currency                   VARCHAR(3)       NOT NULL,
    approved_by                UNIQUEIDENTIFIER NULL,
    approved_at                DATETIME2        NULL,
    created_at                 DATETIME2        NOT NULL CONSTRAINT DF_requests_created DEFAULT SYSUTCDATETIME(),
    updated_at                 DATETIME2        NOT NULL CONSTRAINT DF_requests_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_transport_requests PRIMARY KEY (request_id),
    CONSTRAINT FK_requests_customer FOREIGN KEY (customer_id) REFERENCES users (user_id),
    CONSTRAINT FK_requests_origin FOREIGN KEY (origin_location_id) REFERENCES locations (location_id),
    CONSTRAINT FK_requests_destination FOREIGN KEY (destination_location_id) REFERENCES locations (location_id),
    CONSTRAINT FK_requests_approver FOREIGN KEY (approved_by) REFERENCES users (user_id)
);
GO

/* ---------- 2.8 transport_request_horses (bang lien ket N-N) ---------- */
CREATE TABLE transport_request_horses (
    request_id  UNIQUEIDENTIFIER NOT NULL,
    horse_id    UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_transport_request_horses PRIMARY KEY (request_id, horse_id),
    CONSTRAINT FK_trh_request FOREIGN KEY (request_id) REFERENCES transport_requests (request_id),
    CONSTRAINT FK_trh_horse FOREIGN KEY (horse_id) REFERENCES horses (horse_id)
);
GO

/* ---------- 2.9 horse_documents (phu thuoc horses, transport_requests) ---------- */
CREATE TABLE horse_documents (
    document_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_documents_id DEFAULT NEWID(),
    horse_id       UNIQUEIDENTIFIER NOT NULL,
    request_id     UNIQUEIDENTIFIER NULL,
    document_type  NVARCHAR(100)    NOT NULL,
    file_url       NVARCHAR(512)    NOT NULL,
    uploaded_at    DATETIME2        NOT NULL CONSTRAINT DF_documents_uploaded DEFAULT SYSUTCDATETIME(),
    expiry_date    DATE             NULL,
    CONSTRAINT PK_horse_documents PRIMARY KEY (document_id),
    CONSTRAINT FK_documents_horse FOREIGN KEY (horse_id) REFERENCES horses (horse_id),
    CONSTRAINT FK_documents_request FOREIGN KEY (request_id) REFERENCES transport_requests (request_id)
);
GO

/* ---------- 2.10 customs_regulations (phu thuoc locations) ---------- */
CREATE TABLE customs_regulations (
    regulation_id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_regulations_id DEFAULT NEWID(),
    country_code          VARCHAR(3)       NOT NULL,
    port_location_id      UNIQUEIDENTIFIER NULL,
    quarantine_standard   NVARCHAR(MAX)    NULL,
    required_documents    NVARCHAR(MAX)    NULL,
    import_export_type    VARCHAR(10)      NOT NULL,
    CONSTRAINT PK_customs_regulations PRIMARY KEY (regulation_id),
    CONSTRAINT FK_regulations_port FOREIGN KEY (port_location_id) REFERENCES locations (location_id),
    CONSTRAINT CK_regulations_type CHECK (import_export_type IN ('IMPORT','EXPORT'))
);
GO

/* ---------- 2.11 inspection_statuses (phu thuoc transport_requests, horses, users)
   [CAP NHAT] them assigned_specialist_id de gan Transport Specialist
   phu trach ho so kiem dich/thong quan (Flow 2) ---------- */
CREATE TABLE inspection_statuses (
    inspection_id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_inspection_id DEFAULT NEWID(),
    request_id              UNIQUEIDENTIFIER NOT NULL,
    horse_id                UNIQUEIDENTIFIER NOT NULL,
    agency_name             NVARCHAR(150)    NOT NULL,
    status                  NVARCHAR(50)     NOT NULL,
    remarks                 NVARCHAR(MAX)    NULL,
    assigned_specialist_id  UNIQUEIDENTIFIER NULL,
    updated_at              DATETIME2        NOT NULL CONSTRAINT DF_inspection_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_inspection_statuses PRIMARY KEY (inspection_id),
    CONSTRAINT FK_inspection_request FOREIGN KEY (request_id) REFERENCES transport_requests (request_id),
    CONSTRAINT FK_inspection_horse FOREIGN KEY (horse_id) REFERENCES horses (horse_id),
    CONSTRAINT FK_inspection_specialist FOREIGN KEY (assigned_specialist_id) REFERENCES users (user_id)
);
GO

/* ---------- 2.12 transport_plans (phu thuoc transport_requests, users)
   [CAP NHAT] them coordinator_id de gan Fleet & Route Coordinator
   lap ke hoach lo trinh (Flow 3) ---------- */
CREATE TABLE transport_plans (
    plan_id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_plans_id DEFAULT NEWID(),
    request_id       UNIQUEIDENTIFIER NOT NULL,
    route_details    NVARCHAR(MAX)    NULL,
    departure_time   DATETIME2        NOT NULL,
    arrival_time     DATETIME2        NOT NULL,
    status           NVARCHAR(50)     NOT NULL,
    coordinator_id   UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_transport_plans PRIMARY KEY (plan_id),
    CONSTRAINT FK_plans_request FOREIGN KEY (request_id) REFERENCES transport_requests (request_id),
    CONSTRAINT FK_plans_coordinator FOREIGN KEY (coordinator_id) REFERENCES users (user_id)
);
GO

/* ---------- 2.13 route_stops [BANG MOI] (phu thuoc transport_plans, locations)
   The hien tung diem dung theo thu tu tren lo trinh: tram kiem dich,
   tram nghi, tram tiep nhien lieu, thong quan... phuc vu Flow 3 va Flow 4 ---------- */
CREATE TABLE route_stops (
    stop_id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_route_stops_id DEFAULT NEWID(),
    plan_id                  UNIQUEIDENTIFIER NOT NULL,
    sequence_no              INT              NOT NULL,
    location_id              UNIQUEIDENTIFIER NULL,
    stop_name                NVARCHAR(150)    NOT NULL,
    stop_type                VARCHAR(50)      NOT NULL,
    planned_arrival_time     DATETIME2        NULL,
    planned_departure_time   DATETIME2        NULL,
    actual_arrival_time      DATETIME2        NULL,
    actual_departure_time    DATETIME2        NULL,
    notes                    NVARCHAR(MAX)    NULL,
    CONSTRAINT PK_route_stops PRIMARY KEY (stop_id),
    CONSTRAINT FK_route_stops_plan FOREIGN KEY (plan_id) REFERENCES transport_plans (plan_id),
    CONSTRAINT FK_route_stops_location FOREIGN KEY (location_id) REFERENCES locations (location_id),
    CONSTRAINT UQ_route_stops_plan_seq UNIQUE (plan_id, sequence_no),
    CONSTRAINT CK_route_stops_type CHECK (stop_type IN ('ORIGIN','TRANSIT','CUSTOMS','QUARANTINE','REST','REFUEL','DESTINATION'))
);
GO

/* ---------- 2.14 transport_assignments (phu thuoc transport_plans, transport_assets, users) ---------- */
CREATE TABLE transport_assignments (
    assignment_id       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_assignments_id DEFAULT NEWID(),
    plan_id             UNIQUEIDENTIFIER NOT NULL,
    asset_id            UNIQUEIDENTIFIER NULL,
    driver_user_id      UNIQUEIDENTIFIER NULL,
    attendant_user_id   UNIQUEIDENTIFIER NULL,
    assigned_at         DATETIME2        NOT NULL CONSTRAINT DF_assignments_assigned DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_transport_assignments PRIMARY KEY (assignment_id),
    CONSTRAINT FK_assignments_plan FOREIGN KEY (plan_id) REFERENCES transport_plans (plan_id),
    CONSTRAINT FK_assignments_asset FOREIGN KEY (asset_id) REFERENCES transport_assets (asset_id),
    CONSTRAINT FK_assignments_driver FOREIGN KEY (driver_user_id) REFERENCES users (user_id),
    CONSTRAINT FK_assignments_attendant FOREIGN KEY (attendant_user_id) REFERENCES users (user_id)
);
GO

/* ---------- 2.15 tracking_logs (phu thuoc transport_plans, users) ---------- */
CREATE TABLE tracking_logs (
    log_id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_tracking_id DEFAULT NEWID(),
    plan_id       UNIQUEIDENTIFIER NOT NULL,
    milestone     NVARCHAR(100)    NULL,
    latitude      DECIMAL(9,6)     NOT NULL,
    longitude     DECIMAL(9,6)     NOT NULL,
    reported_at   DATETIME2        NOT NULL CONSTRAINT DF_tracking_reported DEFAULT SYSUTCDATETIME(),
    reported_by   UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_tracking_logs PRIMARY KEY (log_id),
    CONSTRAINT FK_tracking_plan FOREIGN KEY (plan_id) REFERENCES transport_plans (plan_id),
    CONSTRAINT FK_tracking_user FOREIGN KEY (reported_by) REFERENCES users (user_id)
);
GO

/* ---------- 2.16 health_logs (phu thuoc transport_plans, horses, users) ---------- */
CREATE TABLE health_logs (
    log_id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_health_id DEFAULT NEWID(),
    plan_id           UNIQUEIDENTIFIER NOT NULL,
    horse_id          UNIQUEIDENTIFIER NOT NULL,
    stress_level      INT              NULL,
    heart_rate        INT              NULL,
    temperature       DECIMAL(4,2)     NULL,
    appetite_status   NVARCHAR(50)     NULL,
    notes             NVARCHAR(MAX)    NULL,
    photo_url         NVARCHAR(512)    NULL,
    logged_at         DATETIME2        NOT NULL CONSTRAINT DF_health_logged DEFAULT SYSUTCDATETIME(),
    logged_by         UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_health_logs PRIMARY KEY (log_id),
    CONSTRAINT FK_health_plan FOREIGN KEY (plan_id) REFERENCES transport_plans (plan_id),
    CONSTRAINT FK_health_horse FOREIGN KEY (horse_id) REFERENCES horses (horse_id),
    CONSTRAINT FK_health_user FOREIGN KEY (logged_by) REFERENCES users (user_id)
);
GO

/* ---------- 2.17 incidents (phu thuoc transport_plans, users) ---------- */
CREATE TABLE incidents (
    incident_id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_incidents_id DEFAULT NEWID(),
    plan_id            UNIQUEIDENTIFIER NOT NULL,
    category           NVARCHAR(50)     NOT NULL,
    description        NVARCHAR(MAX)    NOT NULL,
    is_sos             BIT              NOT NULL CONSTRAINT DF_incidents_sos DEFAULT 0,
    latitude           DECIMAL(9,6)     NULL,
    longitude          DECIMAL(9,6)     NULL,
    status             NVARCHAR(50)     NOT NULL,
    additional_cost    DECIMAL(12,2)    NULL,
    cost_approved_by   UNIQUEIDENTIFIER NULL,
    reported_at        DATETIME2        NOT NULL CONSTRAINT DF_incidents_reported DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_incidents PRIMARY KEY (incident_id),
    CONSTRAINT FK_incidents_plan FOREIGN KEY (plan_id) REFERENCES transport_plans (plan_id),
    CONSTRAINT FK_incidents_approver FOREIGN KEY (cost_approved_by) REFERENCES users (user_id)
);
GO

/* ---------- 2.18 deliveries (phu thuoc transport_plans) ---------- */
CREATE TABLE deliveries (
    delivery_id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_deliveries_id DEFAULT NEWID(),
    plan_id                UNIQUEIDENTIFIER NOT NULL,
    recipient_name         NVARCHAR(150)    NOT NULL,
    signature_image_url    NVARCHAR(512)    NOT NULL,
    delivered_at           DATETIME2        NOT NULL CONSTRAINT DF_deliveries_delivered DEFAULT SYSUTCDATETIME(),
    pod_document_url       NVARCHAR(512)    NULL,
    CONSTRAINT PK_deliveries PRIMARY KEY (delivery_id),
    CONSTRAINT FK_deliveries_plan FOREIGN KEY (plan_id) REFERENCES transport_plans (plan_id)
);
GO

/* ---------- 2.19 invoices (phu thuoc transport_requests) ---------- */
CREATE TABLE invoices (
    invoice_id       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_invoices_id DEFAULT NEWID(),
    request_id       UNIQUEIDENTIFIER NOT NULL,
    amount           DECIMAL(12,2)    NOT NULL,
    currency         VARCHAR(3)       NOT NULL,
    pdf_url          NVARCHAR(512)    NOT NULL,
    payment_status   NVARCHAR(50)     NOT NULL,
    payment_method   NVARCHAR(50)     NULL,
    issued_at        DATETIME2        NOT NULL CONSTRAINT DF_invoices_issued DEFAULT SYSUTCDATETIME(),
    paid_at          DATETIME2        NULL,
    CONSTRAINT PK_invoices PRIMARY KEY (invoice_id),
    CONSTRAINT FK_invoices_request FOREIGN KEY (request_id) REFERENCES transport_requests (request_id)
);
GO

/* ---------- 2.20 quarantine_reservations (phu thuoc transport_requests, locations) ---------- */
CREATE TABLE quarantine_reservations (
    reservation_id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_reservations_id DEFAULT NEWID(),
    request_id            UNIQUEIDENTIFIER NOT NULL,
    facility_location_id  UNIQUEIDENTIFIER NOT NULL,
    start_date            DATE             NOT NULL,
    end_date              DATE             NOT NULL,
    status                NVARCHAR(50)     NOT NULL,
    CONSTRAINT PK_quarantine_reservations PRIMARY KEY (reservation_id),
    CONSTRAINT FK_reservations_request FOREIGN KEY (request_id) REFERENCES transport_requests (request_id),
    CONSTRAINT FK_reservations_facility FOREIGN KEY (facility_location_id) REFERENCES locations (location_id)
);
GO

/* ---------- 2.21 notifications (phu thuoc users; tham chieu mem toi cac thuc the khac) ---------- */
CREATE TABLE notifications (
    notification_id     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_notifications_id DEFAULT NEWID(),
    recipient_user_id    UNIQUEIDENTIFIER NOT NULL,
    type                 VARCHAR(50)      NOT NULL,
    title                NVARCHAR(200)    NOT NULL,
    message              NVARCHAR(MAX)    NULL,
    related_entity_type  VARCHAR(50)      NULL,
    related_entity_id    UNIQUEIDENTIFIER NULL,
    is_read              BIT              NOT NULL CONSTRAINT DF_notifications_is_read DEFAULT 0,
    created_at           DATETIME2        NOT NULL CONSTRAINT DF_notifications_created DEFAULT SYSUTCDATETIME(),
    read_at              DATETIME2        NULL,
    CONSTRAINT PK_notifications PRIMARY KEY (notification_id),
    CONSTRAINT FK_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users (user_id),
    CONSTRAINT CK_notifications_type CHECK (type IN ('REQUEST_STATUS','INSPECTION_UPDATE','PLAN_UPDATE','ASSIGNMENT','INCIDENT_SOS','INVOICE','QUARANTINE','SYSTEM'))
);
GO

/* ---------- 2.22 audit_logs (phu thuoc users) ---------- */
CREATE TABLE audit_logs (
    log_id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_audit_id DEFAULT NEWID(),
    user_id       UNIQUEIDENTIFIER NULL,
    action        NVARCHAR(150)    NOT NULL,
    details       NVARCHAR(MAX)    NULL,
    ip_address    VARCHAR(45)      NULL,
    created_at    DATETIME2        NOT NULL CONSTRAINT DF_audit_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_audit_logs PRIMARY KEY (log_id),
    CONSTRAINT FK_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
GO

/* ============================================================================
   3. INDEXES (ngoai PK/UQ da tao tu dong o tren)
   ============================================================================ */

CREATE INDEX IX_users_role_id ON users (role_id);
CREATE INDEX IX_horses_owner_user_id ON horses (owner_user_id);
CREATE INDEX IX_transport_assets_owner_partner_id ON transport_assets (owner_partner_id);
CREATE INDEX IX_transport_assets_status ON transport_assets (status);

CREATE INDEX IX_requests_customer_id ON transport_requests (customer_id);
CREATE INDEX IX_requests_origin_location_id ON transport_requests (origin_location_id);
CREATE INDEX IX_requests_destination_location_id ON transport_requests (destination_location_id);
CREATE INDEX IX_requests_status ON transport_requests (status);
CREATE INDEX IX_requests_approved_by ON transport_requests (approved_by);

CREATE INDEX IX_trh_horse_id ON transport_request_horses (horse_id);

CREATE INDEX IX_documents_horse_id ON horse_documents (horse_id);
CREATE INDEX IX_documents_request_id ON horse_documents (request_id);
CREATE INDEX IX_documents_expiry_date ON horse_documents (expiry_date);

CREATE INDEX IX_regulations_country_code ON customs_regulations (country_code);
CREATE INDEX IX_regulations_port_location_id ON customs_regulations (port_location_id);

CREATE INDEX IX_inspection_request_id ON inspection_statuses (request_id);
CREATE INDEX IX_inspection_horse_id ON inspection_statuses (horse_id);
CREATE INDEX IX_inspection_status ON inspection_statuses (status);
CREATE INDEX IX_inspection_specialist_id ON inspection_statuses (assigned_specialist_id);

CREATE INDEX IX_plans_request_id ON transport_plans (request_id);
CREATE INDEX IX_plans_status ON transport_plans (status);
CREATE INDEX IX_plans_coordinator_id ON transport_plans (coordinator_id);

CREATE INDEX IX_route_stops_plan_id ON route_stops (plan_id);
CREATE INDEX IX_route_stops_location_id ON route_stops (location_id);
CREATE INDEX IX_route_stops_type ON route_stops (stop_type);

CREATE INDEX IX_assignments_plan_id ON transport_assignments (plan_id);
CREATE INDEX IX_assignments_asset_id ON transport_assignments (asset_id);
CREATE INDEX IX_assignments_driver_user_id ON transport_assignments (driver_user_id);
CREATE INDEX IX_assignments_attendant_user_id ON transport_assignments (attendant_user_id);

CREATE INDEX IX_tracking_plan_id ON tracking_logs (plan_id);
CREATE INDEX IX_tracking_reported_by ON tracking_logs (reported_by);
CREATE INDEX IX_tracking_reported_at ON tracking_logs (reported_at);

CREATE INDEX IX_health_plan_id ON health_logs (plan_id);
CREATE INDEX IX_health_horse_id ON health_logs (horse_id);
CREATE INDEX IX_health_logged_by ON health_logs (logged_by);

CREATE INDEX IX_incidents_plan_id ON incidents (plan_id);
CREATE INDEX IX_incidents_cost_approved_by ON incidents (cost_approved_by);
CREATE INDEX IX_incidents_is_sos ON incidents (is_sos);
CREATE INDEX IX_incidents_status ON incidents (status);

CREATE INDEX IX_deliveries_plan_id ON deliveries (plan_id);

CREATE INDEX IX_invoices_request_id ON invoices (request_id);
CREATE INDEX IX_invoices_payment_status ON invoices (payment_status);

CREATE INDEX IX_reservations_request_id ON quarantine_reservations (request_id);
CREATE INDEX IX_reservations_facility_location_id ON quarantine_reservations (facility_location_id);
CREATE INDEX IX_reservations_status ON quarantine_reservations (status);

CREATE INDEX IX_notifications_recipient_user_id ON notifications (recipient_user_id);
CREATE INDEX IX_notifications_is_read ON notifications (is_read);
CREATE INDEX IX_notifications_type ON notifications (type);
CREATE INDEX IX_notifications_created_at ON notifications (created_at);
CREATE INDEX IX_notifications_related_entity ON notifications (related_entity_type, related_entity_id);

CREATE INDEX IX_audit_user_id ON audit_logs (user_id);
CREATE INDEX IX_audit_action ON audit_logs (action);
CREATE INDEX IX_audit_created_at ON audit_logs (created_at);
GO

/* ============================================================================
   4. DU LIEU MAU (sample data)
   GUID duoc ghi co dinh de de tham chieu cheo giua cac bang.
   ============================================================================ */

/* ---------- 4.1 roles [CAP NHAT] tach STAFF thanh 4 vai tro nghiep vu cu the ---------- */
INSERT INTO roles (role_id, role_name, description) VALUES
('ADMIN',                N'Quan tri he thong',                  N'Quan tri toan bo he thong (tai khoan, cau hinh)'),
('LOGISTICS_MANAGER',    N'Quan ly Dieu hanh Logistics',        N'Tiep nhan/phe duyet don hang, lap ke hoach tong the, phan cong nhan su, phe duyet chi phi phat sinh'),
('TRANSPORT_SPECIALIST', N'Chuyen vien Thu tuc & Kiem dich',    N'Quan ly quy dinh y te/kiem dich/hai quan, ho so van chuyen so hoa, theo doi phe duyet tu co quan chuc nang'),
('FLEET_COORDINATOR',    N'Dieu phoi vien Doi xe & Lo trinh',   N'Quan ly phuong tien chuyen dung, xay dung lo trinh, cap nhat tien do tung chang'),
('DRIVER_ESCORT',        N'Tai xe / Nhan vien di kem',          N'Thuc hien van chuyen, bao cao tien do va nhat ky suc khoe ngua, bao su co khan cap'),
('CUSTOMER',             N'Khach hang',                         N'Chu ngua/CLB gui yeu cau van chuyen va theo doi don hang');
GO

/* ---------- 4.2 partners ---------- */
INSERT INTO partners (partner_id, name, type, contract_info, rate_table) VALUES
('a1000000-0000-0000-0000-000000000001', N'Cong ty Van tai Hang khong Toan cau', N'AIR_CARGO_AGENT', N'Hop dong nam 2026, hieu luc den 2027-12-31', N'{"base_rate_vnd":500000000}'),
('a1000000-0000-0000-0000-000000000002', N'Cong ty Van chuyen Duong bo Kanto',   N'GROUND_CARRIER',  N'Hop dong nam 2026, hieu luc den 2027-06-30', N'{"base_rate_vnd":150000000}');
GO

/* ---------- 4.3 locations ---------- */
INSERT INTO locations (location_id, name, type, latitude, longitude, capacity, contact_info, country_code) VALUES
('b2000000-0000-0000-0000-000000000001', N'Ga hang hoa San bay Quoc te Narita', N'SAN BAY',                 35.764700, 140.386200, 20, N'042-XXX-XXXX', 'JPN'),
('b2000000-0000-0000-0000-000000000002', N'Trung tam kiem dich ngua Sa Dien',   N'CHUONG NGUA BAO THUE',    22.386700, 114.196900, 15, N'+852-XXXX-XXXX', 'HKG'),
('b2000000-0000-0000-0000-000000000003', N'San bay Quoc te Xich Lap Giac',      N'SAN BAY',                 22.308000, 113.918500, 25, N'+852-XXXX-XXXX', 'HKG'),
('b2000000-0000-0000-0000-000000000004', N'Tram kiem dich dong vat chi nhanh Tokyo', N'CO SO KIEM DICH CHI DINH', 35.549700, 139.779100, 10, N'03-XXXX-XXXX', 'JPN');
GO

/* ---------- 4.4 users [CAP NHAT] mo rong thanh 7 nguoi dung, gan dung 5 vai tro nghiep vu ---------- */
INSERT INTO users (user_id, email, password_hash, role_id, name, phone_number, organization_name) VALUES
('c3000000-0000-0000-0000-000000000001', 'admin@example.com',              '$2a$hash_admin',      'ADMIN',                N'Nguyen Van An',    '0901000001', NULL),
('c3000000-0000-0000-0000-000000000002', 'logistics.manager@example.com',  '$2a$hash_manager',    'LOGISTICS_MANAGER',    N'Tran Thi Hoa',     '0901000002', NULL),
('c3000000-0000-0000-0000-000000000003', 'driver@example.com',             '$2a$hash_driver',     'DRIVER_ESCORT',        N'Le Van Binh',      '0901000003', NULL),
('c3000000-0000-0000-0000-000000000004', 'escort.vet@example.com',         '$2a$hash_vet',        'DRIVER_ESCORT',        N'Pham Van Cuong',   '0901000004', NULL),
('c3000000-0000-0000-0000-000000000005', 'customer@example.com',           '$2a$hash_customer',   'CUSTOMER',             N'Hoang Van Dung',   '0908123456', N'Trai Cu Chi Stable'),
('c3000000-0000-0000-0000-000000000006', 'specialist@example.com',         '$2a$hash_specialist', 'TRANSPORT_SPECIALIST', N'Ngo Thi Mai',      '0901000006', NULL),
('c3000000-0000-0000-0000-000000000007', 'fleet.coordinator@example.com',  '$2a$hash_coordinator','FLEET_COORDINATOR',    N'Dang Van Nam',     '0901000007', NULL);
GO

/* ---------- 4.5 horses ---------- */
INSERT INTO horses (horse_id, microchip_id, name, pedigree, owner_user_id, medical_history, allergies, temperament, gender) VALUES
('d4000000-0000-0000-0000-000000000001', 'MC-0001', N'Sakura Ace',    N'Cha: Deep Impact - Me: Sakura Hana', 'c3000000-0000-0000-0000-000000000005', N'Khong co tien su benh', N'Khong', N'Hien lanh', N'Duc'),
('d4000000-0000-0000-0000-000000000002', 'MC-0002', N'Hayate Fujin',  N'Cha: King Kamehameha - Me: Hayate',  'c3000000-0000-0000-0000-000000000005', N'Khong co tien su benh', N'Di ung phan hoa', N'Hoi nhay cam', N'Cai'),
('d4000000-0000-0000-0000-000000000003', 'MC-0003', N'Rising Sun',    N'Cha: Lord Kanaloa - Me: Sunrise',    'c3000000-0000-0000-0000-000000000005', N'Tung dieu tri mong guoc', N'Khong', N'Hieu dong', N'Thien');
GO

/* ---------- 4.6 transport_assets ---------- */
INSERT INTO transport_assets (asset_id, name, type, capacity, owner_partner_id, status) VALUES
('e5000000-0000-0000-0000-000000000001', N'Container #AC-101', 'AIR_CONTAINER', 3, 'a1000000-0000-0000-0000-000000000001', N'San sang su dung'),
('e5000000-0000-0000-0000-000000000002', N'Xe tai van chuyen 501', 'TRUCK', 2, 'a1000000-0000-0000-0000-000000000002', N'Dang van hanh'),
('e5000000-0000-0000-0000-000000000003', N'Chuyen bay JL-701 - Khoang hang hoa', 'FLIGHT_SLOT', 4, NULL, N'San sang su dung');
GO

/* ---------- 4.7 transport_requests [CAP NHAT] them approved_by/approved_at ---------- */
INSERT INTO transport_requests (request_id, customer_id, origin_location_id, destination_location_id, scheduled_departure_date, scheduled_arrival_date, special_requirements, status, estimated_amount, currency, approved_by, approved_at) VALUES
('f6000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000003', '2026-10-01', '2026-10-02', N'Mong muon xep 2 con cung khoang', N'Da phe duyet', 16500.00, 'USD', 'c3000000-0000-0000-0000-000000000002', '2026-09-15T09:30:00'),
('f6000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', '2026-11-10', '2026-11-11', NULL, N'Dang tham dinh', 12000.00, 'USD', NULL, NULL),
('f6000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002', '2026-09-01', '2026-09-02', NULL, N'Da huy', NULL, 'USD', NULL, NULL);
GO

/* ---------- 4.8 transport_request_horses ---------- */
INSERT INTO transport_request_horses (request_id, horse_id) VALUES
('f6000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001'),
('f6000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000002'),
('f6000000-0000-0000-0000-000000000002', 'd4000000-0000-0000-0000-000000000003');
GO

/* ---------- 4.9 horse_documents ---------- */
INSERT INTO horse_documents (document_id, horse_id, request_id, document_type, file_url, expiry_date) VALUES
(NEWID(), 'd4000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', N'Giay chung nhan suc khoe', 'https://s3.example.com/docs/health_0001.pdf', '2027-01-01'),
(NEWID(), 'd4000000-0000-0000-0000-000000000002', 'f6000000-0000-0000-0000-000000000001', N'Giay chung nhan tiem chung', 'https://s3.example.com/docs/vaccine_0002.pdf', '2026-12-01'),
(NEWID(), 'd4000000-0000-0000-0000-000000000003', 'f6000000-0000-0000-0000-000000000002', N'Ho chieu ngua', 'https://s3.example.com/docs/passport_0003.pdf', NULL);
GO

/* ---------- 4.10 customs_regulations ---------- */
INSERT INTO customs_regulations (regulation_id, country_code, port_location_id, quarantine_standard, required_documents, import_export_type) VALUES
(NEWID(), 'JPN', 'b2000000-0000-0000-0000-000000000001', N'Kiem dich luu giu 72 gio sau khi den', N'Giay chung nhan suc khoe, giay chung nhan tiem chung', 'IMPORT'),
(NEWID(), 'HKG', 'b2000000-0000-0000-0000-000000000003', N'Kiem dich cach ly 14 ngay truoc khi xuat canh', N'Ho chieu ngua, giay chung nhan suc khoe', 'EXPORT');
GO

/* ---------- 4.11 inspection_statuses [CAP NHAT] them assigned_specialist_id ---------- */
INSERT INTO inspection_statuses (inspection_id, request_id, horse_id, agency_name, status, remarks, assigned_specialist_id) VALUES
(NEWID(), 'f6000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', N'Tram kiem dich dong vat', N'Da phe duyet', NULL, 'c3000000-0000-0000-0000-000000000006'),
(NEWID(), 'f6000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000002', N'Hai quan',               N'Dang xu ly', NULL, 'c3000000-0000-0000-0000-000000000006'),
(NEWID(), 'f6000000-0000-0000-0000-000000000002', 'd4000000-0000-0000-0000-000000000003', N'Bo Nong nghiep',         N'Yeu cau bo sung ho so', N'Can nop lai giay chung nhan tiem chung', 'c3000000-0000-0000-0000-000000000006');
GO

/* ---------- 4.12 transport_plans [CAP NHAT] them coordinator_id ---------- */
INSERT INTO transport_plans (plan_id, request_id, route_details, departure_time, arrival_time, status, coordinator_id) VALUES
('11a00000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', N'{"route":["NRT","HKG"]}', '2026-10-01T08:00:00', '2026-10-02T14:00:00', N'Hoan thanh', 'c3000000-0000-0000-0000-000000000007'),
('11a00000-0000-0000-0000-000000000002', 'f6000000-0000-0000-0000-000000000002', N'{"route":["HKG","NRT"]}', '2026-11-10T09:00:00', '2026-11-11T15:00:00', N'Dang lap ke hoach', 'c3000000-0000-0000-0000-000000000007');
GO

/* ---------- 4.13 route_stops [BANG MOI] chi tiet tung diem dung theo thu tu ---------- */
INSERT INTO route_stops (stop_id, plan_id, sequence_no, location_id, stop_name, stop_type, planned_arrival_time, planned_departure_time) VALUES
(NEWID(), '11a00000-0000-0000-0000-000000000001', 1, 'b2000000-0000-0000-0000-000000000001', N'San bay Narita - Diem xuat phat',        'ORIGIN',      NULL, '2026-10-01T08:00:00'),
(NEWID(), '11a00000-0000-0000-0000-000000000001', 2, 'b2000000-0000-0000-0000-000000000003', N'San bay Xich Lap Giac - Thong quan',     'CUSTOMS',     '2026-10-01T18:00:00', '2026-10-01T20:00:00'),
(NEWID(), '11a00000-0000-0000-0000-000000000001', 3, 'b2000000-0000-0000-0000-000000000002', N'Trung tam kiem dich Sa Dien - Diem den',  'DESTINATION', '2026-10-02T14:00:00', NULL),
(NEWID(), '11a00000-0000-0000-0000-000000000002', 1, 'b2000000-0000-0000-0000-000000000002', N'Trung tam kiem dich Sa Dien - Diem xuat phat', 'ORIGIN',      NULL, '2026-11-10T09:00:00'),
(NEWID(), '11a00000-0000-0000-0000-000000000002', 2, 'b2000000-0000-0000-0000-000000000001', N'San bay Narita - Diem den',              'DESTINATION', '2026-11-11T15:00:00', NULL);
GO

/* ---------- 4.14 transport_assignments ---------- */
INSERT INTO transport_assignments (assignment_id, plan_id, asset_id, driver_user_id, attendant_user_id) VALUES
(NEWID(), '11a00000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000004'),
(NEWID(), '11a00000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000003', NULL, 'c3000000-0000-0000-0000-000000000004');
GO

/* ---------- 4.15 tracking_logs ---------- */
INSERT INTO tracking_logs (log_id, plan_id, milestone, latitude, longitude, reported_by) VALUES
(NEWID(), '11a00000-0000-0000-0000-000000000001', N'Khoi hanh',           35.764700, 140.386200, 'c3000000-0000-0000-0000-000000000003'),
(NEWID(), '11a00000-0000-0000-0000-000000000001', N'Thong quan',          22.308000, 113.918500, 'c3000000-0000-0000-0000-000000000003'),
(NEWID(), '11a00000-0000-0000-0000-000000000002', N'Chuan bi khoi hanh',  22.386700, 114.196900, 'c3000000-0000-0000-0000-000000000007');
GO

/* ---------- 4.16 health_logs ---------- */
INSERT INTO health_logs (log_id, plan_id, horse_id, stress_level, heart_rate, temperature, appetite_status, notes, logged_by) VALUES
(NEWID(), '11a00000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 3, 40, 37.50, N'Tot', NULL, 'c3000000-0000-0000-0000-000000000004'),
(NEWID(), '11a00000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000002', 5, 48, 38.10, N'Hoi kem', N'Hoi kich dong luc cat canh', 'c3000000-0000-0000-0000-000000000004');
GO

/* ---------- 4.17 incidents [CAP NHAT] cost_approved_by chuyen sang Logistics Manager ---------- */
INSERT INTO incidents (incident_id, plan_id, category, description, is_sos, latitude, longitude, status, additional_cost, cost_approved_by) VALUES
(NEWID(), '11a00000-0000-0000-0000-000000000001', N'Thoi tiet xau', N'Tam dung cho tai san bay do bao tiep can', 0, 22.308000, 113.918500, N'Dang xu ly', 80000.00, 'c3000000-0000-0000-0000-000000000002');
GO

/* ---------- 4.18 deliveries ---------- */
INSERT INTO deliveries (delivery_id, plan_id, recipient_name, signature_image_url, pod_document_url) VALUES
(NEWID(), '11a00000-0000-0000-0000-000000000001', N'Quan ly chuong ngua Sa Dien', 'https://s3.example.com/signatures/sig_0001.png', 'https://s3.example.com/pod/pod_0001.pdf');
GO

/* ---------- 4.19 invoices ---------- */
INSERT INTO invoices (invoice_id, request_id, amount, currency, pdf_url, payment_status, payment_method, paid_at) VALUES
(NEWID(), 'f6000000-0000-0000-0000-000000000001', 16500.00, 'USD', 'https://s3.example.com/invoices/inv_0001.pdf', N'Chua thanh toan', NULL, NULL),
(NEWID(), 'f6000000-0000-0000-0000-000000000002', 12000.00, 'USD', 'https://s3.example.com/invoices/inv_0002.pdf', N'Da thanh toan', N'Chuyen khoan ngan hang', '2026-11-05T10:00:00');
GO

/* ---------- 4.20 quarantine_reservations ---------- */
INSERT INTO quarantine_reservations (reservation_id, request_id, facility_location_id, start_date, end_date, status) VALUES
(NEWID(), 'f6000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000004', '2026-09-25', '2026-09-30', N'Da xac nhan cho');
GO

/* ---------- 4.21 notifications ---------- */
INSERT INTO notifications (notification_id, recipient_user_id, type, title, message, related_entity_type, related_entity_id, is_read, read_at) VALUES
(NEWID(), 'c3000000-0000-0000-0000-000000000005', 'REQUEST_STATUS',   N'Don hang da duoc phe duyet', N'Yeu cau van chuyen cua ban da duoc Logistics Manager phe duyet.', 'transport_requests', 'f6000000-0000-0000-0000-000000000001', 1, '2026-09-15T09:35:00'),
(NEWID(), 'c3000000-0000-0000-0000-000000000006', 'INSPECTION_UPDATE', N'Ho so can bo sung', N'Ho so kiem dich cua ngua Rising Sun can nop lai giay chung nhan tiem chung.', 'inspection_statuses', 'f6000000-0000-0000-0000-000000000002', 0, NULL),
(NEWID(), 'c3000000-0000-0000-0000-000000000007', 'PLAN_UPDATE',      N'Ke hoach lo trinh moi', N'Ban duoc phan cong dieu phoi ke hoach lo trinh cho don hang f6000000-...0002.', 'transport_plans', '11a00000-0000-0000-0000-000000000002', 0, NULL),
(NEWID(), 'c3000000-0000-0000-0000-000000000003', 'ASSIGNMENT',       N'Phan cong chuyen van chuyen', N'Ban duoc phan cong lam tai xe cho ke hoach 11a00000-...0001.', 'transport_assignments', '11a00000-0000-0000-0000-000000000001', 1, '2026-09-30T08:00:00'),
(NEWID(), 'c3000000-0000-0000-0000-000000000002', 'INCIDENT_SOS',     N'Su co can phe duyet chi phi', N'Co su co thoi tiet xau phat sinh chi phi $550 USD can ban phe duyet.', 'incidents', '11a00000-0000-0000-0000-000000000001', 0, NULL);
GO

/* ---------- 4.22 audit_logs ---------- */
INSERT INTO audit_logs (log_id, user_id, action, details, ip_address) VALUES
(NEWID(), 'c3000000-0000-0000-0000-000000000001', N'Dang nhap', N'Quan tri vien dang nhap thanh cong', '203.0.113.10'),
(NEWID(), NULL, N'Bao dong SOS', N'Ghi nhan tu dong su co khan cap', NULL);
GO


/* ---------- 4.23 pricing_item_configs & pricing_package_inclusions ---------- */
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

/* ============================================================================
   END OF SCRIPT
   ============================================================================ */
