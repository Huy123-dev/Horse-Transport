IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'DRIVER')
BEGIN
    INSERT INTO dbo.roles (role_id, role_name, description)
    VALUES ('DRIVER', N'Tài xế', N'Phụ trách lái xe và cập nhật hành trình chuyến được phân công');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'ESCORT')
BEGIN
    INSERT INTO dbo.roles (role_id, role_name, description)
    VALUES ('ESCORT', N'Nhân viên đi kèm', N'Theo dõi sức khỏe và chăm sóc ngựa trong chuyến được phân công');
END;
GO
