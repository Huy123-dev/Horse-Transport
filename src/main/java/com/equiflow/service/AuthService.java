package com.equiflow.service;

import com.equiflow.dto.*;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.default-role-id}")
    private String defaultRoleId;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // ================= REGISTER =================
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
            // trường hợp 2 request đăng ký cùng lúc vượt qua bước kiểm tra ở trên
            throw new ApiException(HttpStatus.CONFLICT, "Email hoặc số điện thoại đã được sử dụng");
        }
        return new MessageResponse("Đăng ký thành công");
    }

    // ================= LOGIN =================
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));

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

    private UserInfo toInfo(User u) {
        return new UserInfo(u.getUserId(), u.getName(), u.getEmail(), u.getPhoneNumber(),
                u.getOrganizationName(), u.getRoleId());
    }
}
