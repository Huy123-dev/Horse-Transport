package com.equiflow.service;

import com.equiflow.dto.AuthResponse;
import com.equiflow.dto.GoogleLoginRequest;
import com.equiflow.dto.UserInfo;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Collections;
import java.util.Locale;

/**
 * Đăng nhập bằng Google: frontend gửi Google ID token (JWT do Google ký),
 * backend xác thực token rồi cấp JWT của hệ thống (giống /api/auth/login).
 */
@Service
public class GoogleAuthService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleAuthService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String defaultRoleId;
    /** null khi chưa cấu hình google.client-id. */
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(UserRepository userRepository, RoleRepository roleRepository,
                             PasswordEncoder passwordEncoder, JwtService jwtService,
                             @Value("${google.client-id:}") String clientId,
                             @Value("${app.default-role-id}") String defaultRoleId) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.defaultRoleId = defaultRoleId;
        this.verifier = (clientId == null || clientId.isBlank())
                ? null
                : new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(Collections.singletonList(clientId.trim()))
                        .build();
    }

    @Transactional
    public AuthResponse login(GoogleLoginRequest req) {
        GoogleIdToken.Payload payload = verify(req.idToken());

        String googleId = payload.getSubject();
        String email = payload.getEmail() == null ? null : payload.getEmail().trim().toLowerCase(Locale.ROOT);
        if (email == null || email.isBlank() || !Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Email của tài khoản Google chưa được xác minh");
        }

        User user = userRepository.findByGoogleId(googleId).orElse(null);
        if (user == null) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = createUser(googleId, email, (String) payload.get("name"));
            } else {
                if (user.getGoogleId() != null && !user.getGoogleId().equals(googleId)) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Email này đã liên kết với một tài khoản Google khác");
                }
                if (!user.isActive()) {
                    throw new ApiException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị vô hiệu hóa");
                }
                // Email đã được Google xác minh -> liên kết tài khoản hiện có với Google
                user.setGoogleId(googleId);
                userRepository.save(user);
            }
        }

        if (!user.isActive()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị vô hiệu hóa");
        }

        String token = jwtService.generate(user);
        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), toInfo(user));
    }

    private GoogleIdToken.Payload verify(String idTokenString) {
        if (verifier == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Đăng nhập Google chưa được cấu hình (thiếu biến môi trường GOOGLE_CLIENT_ID).");
        }
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Token Google không hợp lệ hoặc đã hết hạn");
            }
            return idToken.getPayload();
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            logger.warn("Google ID token verification failed: {}", ex.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token Google không hợp lệ hoặc đã hết hạn");
        } catch (IOException ex) {
            logger.error("Could not reach Google to verify ID token: {}", ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể kết nối Google để xác thực. Vui lòng thử lại sau.");
        }
    }

    private User createUser(String googleId, String email, String googleName) {
        if (!roleRepository.existsById(defaultRoleId)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Chưa cấu hình role mặc định (app.default-role-id='" + defaultRoleId + "' không có trong bảng roles)");
        }

        String name = (googleName == null || googleName.isBlank()) ? email.substring(0, email.indexOf('@')) : googleName.trim();
        if (name.length() > 100) {
            name = name.substring(0, 100);
        }

        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setGoogleId(googleId);
        user.setRoleId(defaultRoleId);
        // Cột password_hash là NOT NULL: dùng mật khẩu ngẫu nhiên không ai biết.
        // Người dùng muốn đăng nhập bằng mật khẩu có thể dùng chức năng "Quên mật khẩu".
        user.setPasswordHash(passwordEncoder.encode(randomSecret()));

        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "Không thể tạo tài khoản từ Google. Vui lòng thử lại.");
        }
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static UserInfo toInfo(User u) {
        return new UserInfo(u.getUserId(), u.getName(), u.getEmail(), u.getPhoneNumber(),
                u.getOrganizationName(), u.getRoleId(), AuthService.resolveStaffType(u));
    }
}
