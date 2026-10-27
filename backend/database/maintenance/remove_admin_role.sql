/*
  One-time SQL Server maintenance script.
  Review the target database and preview these ownership changes before execution:
  - horses.owner_user_id is transferred to the replacement manager.
  - transport_requests.customer_id is transferred to the replacement manager.
    This changes the recorded customer/owner of those requests.
  - notifications are moved to the replacement manager.
  - audit rows are retained with user_id set to NULL; their actor link is removed.
  Other user references are treated as historical/assignment data and block deletion.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ApplyChanges BIT = 0; -- Leave 0 to preview counts; set to 1 only after DBA review.
DECLARE @SourceEmail NVARCHAR(255) = N'admin@example.com';
DECLARE @ReplacementEmail NVARCHAR(255) = N'logistics.manager@example.com';
DECLARE @SourceUserId UNIQUEIDENTIFIER;
DECLARE @ReplacementUserId UNIQUEIDENTIFIER;
DECLARE @TransferredHorses INT = 0;
DECLARE @TransferredRequests INT = 0;
DECLARE @TransferredNotifications INT = 0;
DECLARE @UnlinkedAuditRows INT = 0;
DECLARE @DemotedAdminUsers INT = 0;

BEGIN TRY
    BEGIN TRANSACTION;

    SELECT @SourceUserId = user_id
    FROM dbo.users
    WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(@SourceEmail);

    SELECT @ReplacementUserId = user_id
    FROM dbo.users
    WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(@ReplacementEmail);

    IF @SourceUserId IS NULL
        THROW 51000, 'Source account admin@example.com was not found.', 1;

    IF @ReplacementUserId IS NULL
        THROW 51001, 'Replacement account logistics.manager@example.com was not found.', 1;

    IF @SourceUserId = @ReplacementUserId
        THROW 51002, 'Source and replacement accounts must be different.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_id = 'ADMIN')
        THROW 51003, 'The ADMIN role row was not found.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.users
        WHERE user_id = @SourceUserId AND role_id = 'ADMIN'
    )
        THROW 51004, 'The source account does not currently have the ADMIN role.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.users
        WHERE user_id = @ReplacementUserId AND role_id = 'LOGISTICS_MANAGER'
    )
        THROW 51005, 'The replacement account does not have the LOGISTICS_MANAGER role.', 1;

    IF @ApplyChanges = 0
    BEGIN
        SELECT
            (SELECT COUNT_BIG(*) FROM dbo.users WHERE role_id = 'ADMIN') AS admin_role_users_to_demote,
            (SELECT COUNT_BIG(*) FROM dbo.horses WHERE owner_user_id = @SourceUserId) AS horses_to_transfer,
            (SELECT COUNT_BIG(*) FROM dbo.transport_requests WHERE customer_id = @SourceUserId) AS requests_to_transfer,
            (SELECT COUNT_BIG(*) FROM dbo.notifications WHERE recipient_user_id = @SourceUserId) AS notifications_to_transfer,
            (SELECT COUNT_BIG(*) FROM dbo.audit_logs WHERE user_id = @SourceUserId) AS audit_rows_to_keep_with_actor_unlinked;

        ROLLBACK TRANSACTION;
        RETURN;
    END;

    UPDATE dbo.horses
    SET owner_user_id = @ReplacementUserId
    WHERE owner_user_id = @SourceUserId;
    SET @TransferredHorses = @@ROWCOUNT;

    UPDATE dbo.transport_requests
    SET customer_id = @ReplacementUserId
    WHERE customer_id = @SourceUserId;
    SET @TransferredRequests = @@ROWCOUNT;

    UPDATE dbo.notifications
    SET recipient_user_id = @ReplacementUserId
    WHERE recipient_user_id = @SourceUserId;
    SET @TransferredNotifications = @@ROWCOUNT;

    UPDATE dbo.audit_logs
    SET user_id = NULL
    WHERE user_id = @SourceUserId;
    SET @UnlinkedAuditRows = @@ROWCOUNT;

    UPDATE dbo.users
    SET role_id = 'LOGISTICS_MANAGER',
        updated_at = SYSUTCDATETIME()
    WHERE role_id = 'ADMIN';
    SET @DemotedAdminUsers = @@ROWCOUNT;

    CREATE TABLE #RemainingUserReferences (
        reference_name NVARCHAR(517) NOT NULL
    );

    DECLARE @SchemaName SYSNAME;
    DECLARE @TableName SYSNAME;
    DECLARE @ColumnName SYSNAME;
    DECLARE @ReferenceName NVARCHAR(517);
    DECLARE @CheckSql NVARCHAR(MAX) = N'';

    DECLARE user_reference_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT parent_schema.name, parent_table.name, parent_column.name
        FROM sys.foreign_key_columns AS fk_column
        INNER JOIN sys.tables AS parent_table
            ON parent_table.object_id = fk_column.parent_object_id
        INNER JOIN sys.schemas AS parent_schema
            ON parent_schema.schema_id = parent_table.schema_id
        INNER JOIN sys.columns AS parent_column
            ON parent_column.object_id = fk_column.parent_object_id
            AND parent_column.column_id = fk_column.parent_column_id
        INNER JOIN sys.columns AS referenced_column
            ON referenced_column.object_id = fk_column.referenced_object_id
            AND referenced_column.column_id = fk_column.referenced_column_id
        WHERE fk_column.referenced_object_id = OBJECT_ID(N'dbo.users')
          AND referenced_column.name = N'user_id';

    OPEN user_reference_cursor;
    FETCH NEXT FROM user_reference_cursor INTO @SchemaName, @TableName, @ColumnName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @ReferenceName = CONCAT(@SchemaName, N'.', @TableName, N'.', @ColumnName);
        SET @CheckSql +=
            N'IF EXISTS (SELECT 1 FROM ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName)
            + N' WHERE ' + QUOTENAME(@ColumnName) + N' = @SourceUserId) '
            + N'INSERT INTO #RemainingUserReferences(reference_name) VALUES (N'''
            + REPLACE(@ReferenceName, N'''', N'''''') + N''');';

        FETCH NEXT FROM user_reference_cursor INTO @SchemaName, @TableName, @ColumnName;
    END;

    CLOSE user_reference_cursor;
    DEALLOCATE user_reference_cursor;

    EXEC sys.sp_executesql
        @CheckSql,
        N'@SourceUserId UNIQUEIDENTIFIER',
        @SourceUserId = @SourceUserId;

    IF EXISTS (SELECT 1 FROM #RemainingUserReferences)
    BEGIN
        SELECT reference_name
        FROM #RemainingUserReferences
        ORDER BY reference_name;

        THROW 51006, 'Deletion stopped: remaining user references include assignments or historical attribution. Review them before retrying.', 1;
    END;

    DELETE FROM dbo.users
    WHERE user_id = @SourceUserId;

    IF @@ROWCOUNT <> 1
        THROW 51007, 'Expected to delete exactly one source account.', 1;

    DELETE FROM dbo.roles
    WHERE role_id = 'ADMIN';

    IF @@ROWCOUNT <> 1
        THROW 51008, 'Expected to delete exactly one ADMIN role row.', 1;

    COMMIT TRANSACTION;

    SELECT
        @TransferredHorses AS transferred_horses,
        @TransferredRequests AS transferred_transport_requests,
        @TransferredNotifications AS transferred_notifications,
        @UnlinkedAuditRows AS retained_audit_rows_with_actor_unlinked,
        @DemotedAdminUsers AS users_demoted_to_logistics_manager;
END TRY
BEGIN CATCH
    IF CURSOR_STATUS('local', 'user_reference_cursor') >= 0
        CLOSE user_reference_cursor;
    IF CURSOR_STATUS('local', 'user_reference_cursor') >= -1
        DEALLOCATE user_reference_cursor;

    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
