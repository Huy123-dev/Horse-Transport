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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Set<String> INTERNAL_STAFF_ROLES = Set.of(
            "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR",
            "DRIVER", "ESCORT", "DRIVER_ESCORT");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }


    public List<UserResponse> findAll() {
        Map<String, String> roleNames = roleNames();
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(u -> INTERNAL_STAFF_ROLES.contains(u.getRoleId()))
                .map(u -> toResponse(u, roleNames.get(u.getRoleId())))
                .toList();
    }

    public UserResponse findById(UUID id) {
        User user = getOrThrow(id);
        ensureManageableRole(user.getRoleId());
        return toResponse(user);
    }


    public UserResponse create(UserCreateRequest req) {
        String email = req.email().trim().toLowerCase();
        String phone = req.phone().trim();
        Role role = requireRole(req.roleId());
        ensureManageableRole(role.getRoleId());

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
        user.setStaffType(blankToNull(req.staffType()));
        return toResponse(save(user), role.getRoleName());
    }


    public UserResponse update(UUID id, UserUpdateRequest req, UUID currentUserId) {
        User user = getOrThrow(id);
        String email = req.email().trim().toLowerCase();
        String phone = req.phone().trim();
        Role role = requireRole(req.roleId());
        ensureManageableRole(user.getRoleId());
        ensureManageableRole(role.getRoleId());

        if (userRepository.existsByEmailAndUserIdNot(email, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }
        if (userRepository.existsByPhoneNumberAndUserIdNot(phone, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }

        if (id.equals(currentUserId) && !role.getRoleId().equals(user.getRoleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể tự đổi vai trò của chính mình");
        }

        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPhoneNumber(phone);
        user.setOrganizationName(blankToNull(req.organizationName()));
        user.setRoleId(role.getRoleId());
        user.setStaffType(blankToNull(req.staffType()));
        if (req.password() != null) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        return toResponse(save(user), role.getRoleName());
    }

    public UserResponse setActive(UUID id, boolean active, UUID currentUserId) {
        User user = getOrThrow(id);
        ensureManageableRole(user.getRoleId());
        if (user.getUserId().equals(currentUserId) && !active) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể vô hiệu hóa tài khoản đang đăng nhập");
        }
        if (!active && "LOGISTICS_MANAGER".equals(user.getRoleId())
                && user.isActive() && userRepository.countByRoleIdAndActiveTrue("LOGISTICS_MANAGER") <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "Phải còn ít nhất một Logistics Manager đang hoạt động");
        }
        user.setActive(active);
        return toResponse(save(user));
    }


    private User getOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
    }

    private Role requireRole(String roleId) {

        return roleRepository.findById(roleId.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Vai trò không tồn tại"));
    }

    private static void ensureManageableRole(String roleId) {
        if (!INTERNAL_STAFF_ROLES.contains(roleId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Quản lý Logistics chỉ được quản lý tài khoản nhân sự nội bộ");
        }
    }

    private User save(User user) {
        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {

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
                u.getOrganizationName(), u.getRoleId(), roleName, AuthService.resolveStaffType(u), u.isActive(), u.getCreatedAt(), u.getUpdatedAt());
    }
}
