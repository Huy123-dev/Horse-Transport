package com.equiflow.service;

import com.equiflow.dto.ProfileDto;
import com.equiflow.entity.Role;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final AuditLogService auditLogService;

    public ProfileService(UserRepository userRepository,
                          RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder,
                          FileStorageService fileStorageService,
                          AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public ProfileDto.Response getProfile(UUID userId) {
        User user = getUserOrThrow(userId);
        return toResponse(user);
    }

    @Transactional
    public ProfileDto.Response updateProfile(UUID userId, ProfileDto.UpdateRequest req) {
        User user = getUserOrThrow(userId);

        String trimmedName = req.name() != null ? req.name().trim() : "";
        if (trimmedName.length() < 2 || trimmedName.length() > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Họ và tên phải từ 2 đến 100 ký tự");
        }
        user.setName(trimmedName);

        String phone = blankToNull(req.phoneNumber());
        if (phone != null) {
            if (!phone.matches("^(0|\\+84)\\d{9,10}$")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Số điện thoại không hợp lệ (ví dụ: 0901234567)");
            }
            if (userRepository.existsByPhoneNumberAndUserIdNot(phone, userId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng bởi tài khoản khác");
            }
            user.setPhoneNumber(phone);
        } else {
            user.setPhoneNumber(null);
        }

        user.setOrganizationName(blankToNull(req.organizationName()));

        if (req.avatarUrl() != null) {
            user.setAvatarUrl(blankToNull(req.avatarUrl()));
        }

        User saved = userRepository.saveAndFlush(user);
        auditLogService.record(userId, "UPDATE_PROFILE", "Cập nhật thông tin cá nhân: " + user.getName(), null);
        return toResponse(saved);
    }

    @Transactional
    public Map<String, Object> uploadAvatar(UUID userId, MultipartFile file) {
        User user = getUserOrThrow(userId);

        String key = fileStorageService.storeUserAvatar(file);
        String url;
        try {
            url = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .pathSegment("uploads", key)
                    .toUriString();
        } catch (Exception e) {
            url = "/uploads/" + key;
        }

        user.setAvatarUrl(url);
        User saved = userRepository.saveAndFlush(user);
        auditLogService.record(userId, "UPLOAD_AVATAR", "Cập nhật ảnh đại diện", null);

        return Map.of(
                "url", url,
                "profile", toResponse(saved)
        );
    }

    @Transactional
    public ProfileDto.Response removeAvatar(UUID userId) {
        User user = getUserOrThrow(userId);
        user.setAvatarUrl(null);
        User saved = userRepository.saveAndFlush(user);
        auditLogService.record(userId, "REMOVE_AVATAR", "Xóa ảnh đại diện", null);
        return toResponse(saved);
    }

    @Transactional
    public void changePassword(UUID userId, ProfileDto.ChangePasswordRequest req) {
        User user = getUserOrThrow(userId);

        if (!passwordEncoder.matches(req.oldPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không chính xác");
        }

        if (req.newPassword() == null || req.newPassword().length() < 6) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải có tối thiểu 6 ký tự");
        }

        if (passwordEncoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.saveAndFlush(user);
        auditLogService.record(userId, "CHANGE_PASSWORD", "Thay đổi mật khẩu tài khoản: " + user.getEmail(), null);
    }

    public ProfileDto.Response toResponse(User user) {
        String roleName = roleRepository.findById(user.getRoleId())
                .map(Role::getRoleName)
                .orElse(user.getRoleId());

        return new ProfileDto.Response(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getOrganizationName(),
                user.getRoleId(),
                roleName,
                user.getStaffType(),
                user.getAvatarUrl(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private User getUserOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản"));
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
