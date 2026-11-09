package com.equiflow.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures user accounts and roles are standardized without deleting or recreating any user records.
 * Runs on application startup idempotently.
 */
@Component
public class UserDataStandardizationInitializer {

    private static final Logger log = LoggerFactory.getLogger(UserDataStandardizationInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public UserDataStandardizationInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void standardizeUserData() {
        try {
            // 1. Ensure canonical roles exist
            ensureRoleExists("CUSTOMER", "Khách hàng", "Khách hàng đặt dịch vụ vận chuyển ngựa");
            ensureRoleExists("LOGISTICS_MANAGER", "Quản lý Logistics", "Quản lý chung quy trình vận tải và xét duyệt");
            ensureRoleExists("TRANSPORT_SPECIALIST", "Chuyên viên vận tải", "Chuyên viên thẩm định tuyến đường, pháp lý và chi phí");
            ensureRoleExists("FLEET_COORDINATOR", "Điều phối đội xe", "Điều phối phương tiện, tuyến đường và đội ngũ vận hành");
            ensureRoleExists("DRIVER", "Tài xế", "Tài xế chuyên chở ngựa đua");
            ensureRoleExists("ESCORT", "Nhân viên hộ tống", "Bác sĩ thú y / Nhân viên chăm sóc ngựa trong chuyến đi");
            ensureRoleExists("DRIVER_ESCORT", "Đội ngũ vận hành", "Đội ngũ tài xế và hộ tống trên đường");

            // 2. Standardize users data (trim, lowercase email, normalize staffType, ensure active)
            jdbcTemplate.execute("""
                UPDATE users
                SET email = LOWER(TRIM(email))
                WHERE email IS NOT NULL
            """);

            jdbcTemplate.execute("""
                UPDATE users
                SET name = TRIM(name)
                WHERE name IS NOT NULL
            """);

            try {
                jdbcTemplate.execute("""
                    UPDATE users
                    SET role_id = 'LOGISTICS_MANAGER'
                    WHERE role_id = 'ADMIN'
                """);
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("""
                    UPDATE users
                    SET staff_type = 'DRIVER'
                    WHERE (role_id = 'DRIVER' OR LOWER(email) = 'driver@example.com')
                      AND (staff_type IS NULL OR staff_type != 'DRIVER')
                """);
                jdbcTemplate.execute("""
                    UPDATE users
                    SET staff_type = 'ESCORT'
                    WHERE (role_id = 'ESCORT' OR LOWER(email) = 'escort.vet@example.com')
                      AND (staff_type IS NULL OR staff_type != 'ESCORT')
                """);
            } catch (Exception ignored) {}

            try {
                jdbcTemplate.execute("""
                    UPDATE users
                    SET is_active = TRUE
                    WHERE is_active IS NULL
                """);
            } catch (Exception ex) {
                try {
                    jdbcTemplate.execute("UPDATE dbo.users SET is_active = 1 WHERE is_active IS NULL");
                } catch (Exception ignored) {}
            }

            log.info("Khởi tạo và chuẩn hóa dữ liệu người dùng/vai trò hoàn tất.");
        } catch (Exception ex) {
            log.warn("Không thể thực hiện chuẩn hóa dữ liệu người dùng: {}", ex.getMessage());
        }
    }

    private void ensureRoleExists(String roleId, String roleName, String description) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM roles WHERE role_id = ?",
                    Integer.class,
                    roleId
            );
            if (count == null || count == 0) {
                jdbcTemplate.update(
                        "INSERT INTO roles (role_id, role_name, description) VALUES (?, ?, ?)",
                        roleId, roleName, description
                );
                log.info("Đã tạo vai trò chuẩn: {}", roleId);
            }
        } catch (Exception ex) {
            log.debug("Kiểm tra/tạo vai trò {}: {}", roleId, ex.getMessage());
        }
    }
}
