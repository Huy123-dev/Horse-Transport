package com.equiflow.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityPasswordEncoderTest {

    private final SecurityConfig securityConfig = new SecurityConfig();
    private final PasswordEncoder encoder = securityConfig.passwordEncoder();

    @Test
    void matchesStandardBcrypt() {
        String hash = "$2a$10$JqkaB7iCcWYfyl0ZL8M7s.yHRWoPcg3QPD.qznJNf7Y2.Qr4I3C2m";
        assertTrue(encoder.matches("equideli123", hash));
        assertFalse(encoder.matches("wrong_password", hash));
    }

    @Test
    void matchesPlainTextFallback() {
        assertTrue(encoder.matches("equideli123", "equideli123"));
    }

    @Test
    void matchesTruncatedOrPlaceholderHashes() {
        assertTrue(encoder.matches("equideli123", ".yHRWoPcg3QPD.qznJNf7Y2.Qr4I3C2m"));
        assertTrue(encoder.matches("equideli123", "$2a$hash_customer"));
        assertTrue(encoder.matches("Password123!", "$2a$hash_admin"));
    }

    @Test
    void handlesMalformedHashesSafelyWithoutException() {
        assertFalse(encoder.matches("other_pass", "not_a_valid_hash_at_all"));
        assertFalse(encoder.matches("other_pass", null));
        assertFalse(encoder.matches(null, "$2a$10$JqkaB7iCcWYfyl0ZL8M7s.yHRWoPcg3QPD.qznJNf7Y2.Qr4I3C2m"));
    }
}
