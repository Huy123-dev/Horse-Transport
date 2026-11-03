package com.equiflow.config;

import com.equiflow.entity.User;
import com.equiflow.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Đảm bảo các tài khoản người dùng trong cơ sở dữ liệu luôn có mật khẩu chuẩn BCrypt
 * tương thích với mật khẩu mặc định 'equideli123'.
 */
@Component
public class DemoAccountPasswordInitializer {

    private static final Logger log = LoggerFactory.getLogger(DemoAccountPasswordInitializer.class);
    public static final String DEFAULT_DEMO_PASSWORD = "equideli123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoAccountPasswordInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensureDemoAccountsHaveValidBcryptPassword() {
        try {
            List<User> users = userRepository.findAll();
            if (users.isEmpty()) {
                return;
            }

            int updatedCount = 0;
            String standardEncoded = passwordEncoder.encode(DEFAULT_DEMO_PASSWORD);

            for (User user : users) {
                String currentHash = user.getPasswordHash();
                boolean needsUpdate = false;

                if (currentHash == null || currentHash.isBlank()) {
                    needsUpdate = true;
                } else if (!currentHash.startsWith("$2a$") && !currentHash.startsWith("$2b$") && !currentHash.startsWith("$2y$")) {
                    needsUpdate = true;
                } else {
                    try {
                        if (!passwordEncoder.matches(DEFAULT_DEMO_PASSWORD, currentHash)) {
                            // Nếu là các tài khoản demo chuẩn thì ưu tiên đồng bộ về equideli123
                            if (isStandardDemoAccount(user.getEmail())) {
                                needsUpdate = true;
                            }
                        }
                    } catch (Exception ex) {
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    user.setPasswordHash(standardEncoded);
                    userRepository.save(user);
                    updatedCount++;
                    log.info("Đã đồng bộ mật khẩu chuẩn BCrypt (equideli123) cho tài khoản: {}", user.getEmail());
                }
            }

            if (updatedCount > 0) {
                log.info("Hoàn tất cập nhật mã hóa BCrypt cho {} tài khoản.", updatedCount);
            }
        } catch (Exception e) {
            log.warn("Không thể kiểm tra/cập nhật mật khẩu tài khoản lúc khởi động: {}", e.getMessage());
        }
    }

    private boolean isStandardDemoAccount(String email) {
        if (email == null) return false;
        String lower = email.trim().toLowerCase();
        return lower.endsWith("@example.com");
    }
}
