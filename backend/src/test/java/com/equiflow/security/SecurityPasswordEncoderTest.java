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
    void rejectsPlainTextWithoutBcryptHash() {
        // Plain text must NEVER match directly - backdoor is closed
        assertFalse(encoder.matches("equideli123", "equideli123"));
        assertFalse(encoder.matches("Password123!", "Password123!"));
    }

    @Test
    void rejectsMalformedOrPlaceholderHashes() {
        assertFalse(encoder.matches("equideli123", ".yHRWoPcg3QPD.qznJNf7Y2.Qr4I3C2m"));
        assertFalse(encoder.matches("equideli123", "$2a$hash_customer"));
        assertFalse(encoder.matches("Password123!", "$2a$hash_admin"));
    }

    @Test
    void encodesAndMatchesDynamically() {
        String raw = "MySecurePassword2026!";
        String encoded = encoder.encode(raw);
        assertTrue(encoder.matches(raw, encoded));
        assertFalse(encoder.matches("WrongPassword", encoded));
    }
}
