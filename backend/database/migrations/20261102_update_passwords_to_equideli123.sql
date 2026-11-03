-- ============================================================================
-- Migration: Đổi mật khẩu tất cả các tài khoản demo sang 'equideli123'
-- Ngày tạo: 2026-11-02
-- Mật khẩu: equideli123
-- Hash BCrypt (10 rounds): $2a$10$JqkaB7iCcWYfyl0ZL8M7s.yHRWoPcg3QPD.qznJNf7Y2.Qr4I3C2m
-- ============================================================================

USE HorseTransportManagementDB;
GO

-- Cập nhật mật khẩu cho toàn bộ tài khoản người dùng
UPDATE dbo.users
SET password_hash = '$2a$10$JqkaB7iCcWYfyl0ZL8M7s.yHRWoPcg3QPD.qznJNf7Y2.Qr4I3C2m';
GO
