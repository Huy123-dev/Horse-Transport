package com.equiflow.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class UserProfileSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(UserProfileSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public UserProfileSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public void ensureAvatarColumnExists() {
        try {
            jdbcTemplate.execute("""
                IF COL_LENGTH('dbo.users', 'avatar_url') IS NULL
                BEGIN
                    ALTER TABLE dbo.users ADD avatar_url NVARCHAR(500) NULL;
                END
                IF COL_LENGTH('dbo.users', 'google_id') IS NULL
                BEGIN
                    ALTER TABLE dbo.users ADD google_id NVARCHAR(100) NULL;
                END
            """);
            log.info("Cột avatar_url trong bảng users đã được kiểm tra/khởi tạo.");
        } catch (Exception ex) {
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL");
            } catch (Exception ignored) {
                log.error("Không thể khởi tạo các cột avatar_url/google_id trong bảng users", ex);
                throw new IllegalStateException(
                        "Không thể khởi tạo các cột avatar_url/google_id trong bảng users", ex);
            }
        }
    }
}
