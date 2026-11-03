package com.equiflow.service;

import com.equiflow.dto.*;
import com.equiflow.entity.PasswordResetToken;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.repository.PasswordResetTokenRepository;
import com.equiflow.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String RESET_REQUEST_MESSAGE =
            "Nếu email khớp tài khoản đang hoạt động, hướng dẫn đặt lại mật khẩu có thể được gửi đến hộp thư.";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String resetFrontendUrl;
    private final String mailFrom;

    @Value("${app.default-role-id}")
    private String defaultRoleId;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService,
                       ObjectProvider<JavaMailSender> mailSenderProvider,
                       @Value("${spring.mail.host:}") String mailHost,
                       @Value("${app.password-reset.frontend-url:}") String resetFrontendUrl,
                       @Value("${app.password-reset.mail-from:}") String mailFrom) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.mailHost = mailHost;
        this.resetFrontendUrl = resetFrontendUrl;
        this.mailFrom = mailFrom;
    }

    public MessageResponse register(RegisterRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        }
        String email = req.email().trim().toLowerCase();
        String phone = req.phone().trim();

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }
        if (userRepository.existsByPhoneNumber(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }
        if (!roleRepository.existsById(defaultRoleId)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Chưa cấu hình role mặc định (app.default-role-id='" + defaultRoleId + "' không có trong bảng roles)");
        }

        User user = new User();
        user.setName(req.name().trim());
        user.setPhoneNumber(phone);
        user.setEmail(email);
        user.setOrganizationName(req.organizationName().trim());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRoleId(defaultRoleId);

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "Email hoặc số điện thoại đã được sử dụng");
        }
        return new MessageResponse("Đăng ký thành công");
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));

        if (!user.isActive()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị vô hiệu hóa");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng");
        }

        String token = jwtService.generate(user);
        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), toInfo(user));
    }

    public UserInfo me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ"));
        return toInfo(user);
    }

    @Transactional
    public MessageResponse requestPasswordReset(PasswordResetRequest req) {
        if (mailHost.isBlank() || mailSender == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Dịch vụ đặt lại mật khẩu chưa được cấu hình email (chưa cấu hình biến môi trường SMTP_HOST).");
        }

        String email = req.email().trim().toLowerCase();
        var user = userRepository.findByEmail(email).filter(User::isActive);
        if (user.isEmpty()) {
            return new MessageResponse(RESET_REQUEST_MESSAGE);
        }

        UUID userId = user.get().getUserId();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        passwordResetTokenRepository.deleteExpiredBefore(now);
        if (passwordResetTokenRepository.existsByUserIdAndCreatedAtAfter(userId, now.minusMinutes(1))) {
            return new MessageResponse(RESET_REQUEST_MESSAGE);
        }

        passwordResetTokenRepository.deleteByUserId(userId);
        String rawToken = generateResetToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUserId(userId);
        resetToken.setTokenHash(hashResetToken(rawToken));
        resetToken.setExpiresAt(now.plusMinutes(15));
        passwordResetTokenRepository.save(resetToken);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("Đặt lại mật khẩu Equideli");
            message.setText("""
                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Equideli.
                    Mở liên kết sau trong vòng 15 phút để đặt mật khẩu mới:

                    %s/reset-password?token=%s

                    Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                    """.formatted(resetFrontendUrl.replaceAll("/+$", ""), rawToken));
            mailSender.send(message);
        } catch (MailException ex) {
            passwordResetTokenRepository.deleteByTokenHash(resetToken.getTokenHash());
            logger.error("Password reset email delivery failed: {}", ex.getMessage());
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại dịch vụ email hoặc thử lại sau.");
        }

        return new MessageResponse(RESET_REQUEST_MESSAGE);
    }

    @Transactional
    public MessageResponse confirmPasswordReset(PasswordResetConfirmRequest req) {
        String tokenHash = hashResetToken(req.token());
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."));

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (!resetToken.getExpiresAt().isAfter(now)) {
            passwordResetTokenRepository.delete(resetToken);
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .filter(User::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."));
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        userRepository.save(user);
        resetToken.setUsedAt(now);
        passwordResetTokenRepository.save(resetToken);
        passwordResetTokenRepository.deleteOtherTokens(user.getUserId(), resetToken.getResetTokenId());

        return new MessageResponse("Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.");
    }

    private static String generateResetToken() {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private static String hashResetToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    public static String resolveStaffType(User u) {
        if (u == null) return null;
        if (u.getStaffType() != null && !u.getStaffType().isBlank()) {
            String st = u.getStaffType().trim().toUpperCase(java.util.Locale.ROOT);
            if ("DRIVER".equals(st) || "ESCORT".equals(st)) {
                return st;
            }
        }
        if ("DRIVER".equals(u.getRoleId())) return "DRIVER";
        if ("ESCORT".equals(u.getRoleId())) return "ESCORT";
        if (u.getEmail() != null) {
            String email = u.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
            if ("driver@example.com".equals(email)) return "DRIVER";
            if ("escort.vet@example.com".equals(email)) return "ESCORT";
        }
        return null;
    }

    private UserInfo toInfo(User u) {
        return new UserInfo(u.getUserId(), u.getName(), u.getEmail(), u.getPhoneNumber(),
                u.getOrganizationName(), u.getRoleId(), resolveStaffType(u));
    }
}
