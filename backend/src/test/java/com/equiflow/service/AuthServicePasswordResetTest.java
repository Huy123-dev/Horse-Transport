package com.equiflow.service;

import com.equiflow.dto.PasswordResetConfirmRequest;
import com.equiflow.dto.PasswordResetRequest;
import com.equiflow.entity.PasswordResetToken;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.PasswordResetTokenRepository;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordResetTokenRepository resetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private JavaMailSender mailSender;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        beanFactory.addBean("mailSender", mailSender);
        authService = new AuthService(userRepository, roleRepository, resetTokenRepository,
                passwordEncoder, jwtService, beanFactory.getBeanProvider(JavaMailSender.class), "smtp.example.com",
                "http://localhost:3000", "no-reply@example.com");
    }

    @Test
    void resetRequestDoesNotRevealWhetherAnEmailIsRegistered() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertEquals(
                "Nếu email khớp tài khoản đang hoạt động, hướng dẫn đặt lại mật khẩu có thể được gửi đến hộp thư.",
                authService.requestPasswordReset(new PasswordResetRequest("unknown@example.com")).message());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        verify(resetTokenRepository, never()).save(any(PasswordResetToken.class));
    }

    @Test
    void resetRequestStoresOnlyTokenHashAndEmailsTheRawToken() throws Exception {
        User user = new User();
        user.setUserId(UUID.randomUUID());
        user.setEmail("person@example.com");
        user.setActive(true);
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
        when(resetTokenRepository.existsByUserIdAndCreatedAtAfter(eq(user.getUserId()), any(LocalDateTime.class)))
                .thenReturn(false);
        when(resetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        authService.requestPasswordReset(new PasswordResetRequest(" Person@Example.com "));

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokenRepository).save(tokenCaptor.capture());
        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mailCaptor.capture());

        String rawToken = mailCaptor.getValue().getText().lines()
                .filter(line -> line.contains("/reset-password?token="))
                .map(line -> line.substring(line.indexOf("token=") + "token=".length()))
                .findFirst()
                .orElseThrow();
        assertFalse(tokenCaptor.getValue().getTokenHash().equals(rawToken));
        assertEquals(hash(rawToken), tokenCaptor.getValue().getTokenHash());
        assertEquals(user.getUserId(), tokenCaptor.getValue().getUserId());
    }

    @Test
    void resetTokenChangesPasswordAndIsMarkedUsed() throws Exception {
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]);
        PasswordResetToken token = new PasswordResetToken();
        UUID tokenId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        token.setResetTokenId(tokenId);
        token.setUserId(userId);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5));
        User user = new User();
        user.setUserId(userId);
        user.setActive(true);

        when(resetTokenRepository.findByTokenHashAndUsedAtIsNull(hash(rawToken))).thenReturn(Optional.of(token));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("new-password")).thenReturn("encoded-password");

        assertEquals("Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.",
                authService.confirmPasswordReset(new PasswordResetConfirmRequest(rawToken, "new-password")).message());
        assertEquals("encoded-password", user.getPasswordHash());
        verify(userRepository).save(user);
        verify(resetTokenRepository).save(token);
        verify(resetTokenRepository).deleteOtherTokens(userId, tokenId);
    }

    @Test
    void expiredResetTokenIsRejected() throws Exception {
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]);
        PasswordResetToken token = new PasswordResetToken();
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        when(resetTokenRepository.findByTokenHashAndUsedAtIsNull(hash(rawToken))).thenReturn(Optional.of(token));

        ApiException error = assertThrows(ApiException.class,
                () -> authService.confirmPasswordReset(new PasswordResetConfirmRequest(rawToken, "new-password")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(resetTokenRepository).delete(token);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetRequestIsUnavailableUntilEmailAndFrontendAreConfigured() {
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        AuthService unavailableService = new AuthService(userRepository, roleRepository, resetTokenRepository,
                passwordEncoder, jwtService, beanFactory.getBeanProvider(JavaMailSender.class),
                "", "http://localhost:3000", "no-reply@example.com");

        ApiException error = assertThrows(ApiException.class,
                () -> unavailableService.requestPasswordReset(new PasswordResetRequest("person@example.com")));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        verify(userRepository, never()).findByEmail(any(String.class));
    }

    private static String hash(String token) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    }
}
