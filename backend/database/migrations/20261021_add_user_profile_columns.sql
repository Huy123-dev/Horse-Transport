IF COL_LENGTH('dbo.users', 'phone_number') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD phone_number NVARCHAR(20) NULL;
END;
GO

IF COL_LENGTH('dbo.users', 'organization_name') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD organization_name NVARCHAR(150) NULL;
END;
GO
