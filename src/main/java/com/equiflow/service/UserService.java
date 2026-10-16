package com.equiflow.service;

import com.equiflow.dto.UserCreateRequest;
import com.equiflow.dto.UserResponse;
import com.equiflow.dto.UserUpdateRequest;
import com.equiflow.entity.Role;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= READ =================
    public List<UserResponse> findAll() {
        Map<String, String> roleNames = roleNames();
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(u -> toResponse(u, roleNames.get(u.getRoleId())))
                .toList();
    }

    public UserResponse findById(UUID id) {
        return toResponse(getOrThrow(id));
    }

    // ================= CREATE =================
    public UserResponse create(UserCreateRequest req) {
        String email = req.email().trim().toLowerCase();
        String phone = req.phone().trim();
        Role role = requireRole(req.roleId());

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }
        if (userRepository.existsByPhoneNumber(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }

        User user = new User();
        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPhoneNumber(phone);
        user.setOrganizationName(blankToNull(req.organizationName()));
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRoleId(role.getRoleId());
        return toResponse(save(user), role.getRoleName());
    }

    // ================= UPDATE =================
    public UserResponse update(UUID id, UserUpdateRequest req, UUID currentUserId) {
        User user = getOrThrow(id);
        String email = req.email().trim().toLowerCase();
        String phone = req.phone().trim();
        Role role = requireRole(req.roleId());

        if (userRepository.existsByEmailAndUserIdNot(email, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }
        if (userRepository.existsByPhoneNumberAndUserIdNot(phone, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }
        // tránh quản trị viên tự hạ quyền của chính mình rồi bị khóa khỏi chức năng quản trị
        if (id.equals(currentUserId) && !role.getRoleId().equals(user.getRoleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể tự đổi vai trò của chính mình");
        }

        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPhoneNumber(phone);
        user.setOrganizationName(blankToNull(req.organizationName()));
        user.setRoleId(role.getRoleId());
        if (req.password() != null) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        return toResponse(save(user), role.getRoleName());
    }

    // ================= helpers =================
    private User getOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
    }

    private Role requireRole(String roleId) {
        // role_id trong DB viết hoa (ADMIN, CUSTOMER...); chuẩn hóa để JWT claim "role" luôn khớp ROLE_xxx
        return roleRepository.findById(roleId.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Vai trò không tồn tại"));
    }

    private User save(User user) {
        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // 2 request cùng lúc vượt qua bước kiểm tra trùng ở trên
            throw new ApiException(HttpStatus.CONFLICT, "Email hoặc số điện thoại đã được sử dụng");
        }
    }

    private Map<String, String> roleNames() {
        return roleRepository.findAll().stream()
                .collect(Collectors.toMap(Role::getRoleId, Role::getRoleName));
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private UserResponse toResponse(User u) {
        String roleName = roleRepository.findById(u.getRoleId()).map(Role::getRoleName).orElse(null);
        return toResponse(u, roleName);
    }

    private static UserResponse toResponse(User u, String roleName) {
        return new UserResponse(u.getUserId(), u.getName(), u.getEmail(), u.getPhoneNumber(),
                u.getOrganizationName(), u.getRoleId(), roleName, u.getCreatedAt(), u.getUpdatedAt());
    }
}
