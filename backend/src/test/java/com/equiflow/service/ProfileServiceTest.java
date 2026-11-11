package com.equiflow.service;

import com.equiflow.dto.ProfileDto;
import com.equiflow.entity.Role;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProfileServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final FileStorageService fileStorageService = mock(FileStorageService.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);

    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        profileService = new ProfileService(
                userRepository,
                roleRepository,
                passwordEncoder,
                fileStorageService,
                auditLogService
        );
    }

    @Test
    void getProfileReturnsUserResponse() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setName("Hoàng Văn Dũng");
        user.setEmail("customer@example.com");
        user.setPhoneNumber("0908123456");
        user.setRoleId("CUSTOMER");
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        Role role = new Role();
        role.setRoleId("CUSTOMER");
        role.setRoleName("Khách hàng");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findById("CUSTOMER")).thenReturn(Optional.of(role));

        ProfileDto.Response response = profileService.getProfile(userId);

        assertNotNull(response);
        assertEquals(userId, response.userId());
        assertEquals("Hoàng Văn Dũng", response.name());
        assertEquals("customer@example.com", response.email());
        assertEquals("Khách hàng", response.roleName());
    }

    @Test
    void updateProfileUpdatesFieldsAndAudits() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setName("Old Name");
        user.setEmail("user@example.com");
        user.setRoleId("CUSTOMER");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByPhoneNumberAndUserIdNot(anyString(), eq(userId))).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        ProfileDto.UpdateRequest req = new ProfileDto.UpdateRequest(
                "Trần Thị Hoa",
                "0901000002",
                "Equideli Logistics",
                "https://example.com/avatar.jpg"
        );

        ProfileDto.Response response = profileService.updateProfile(userId, req);

        assertEquals("Trần Thị Hoa", response.name());
        assertEquals("0901000002", response.phoneNumber());
        assertEquals("Equideli Logistics", response.organizationName());
        assertEquals("https://example.com/avatar.jpg", response.avatarUrl());
        verify(auditLogService).record(eq(userId), eq("UPDATE_PROFILE"), contains("Trần Thị Hoa"), isNull());
    }

    @Test
    void updateProfileRejectsInvalidPhoneFormat() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setName("Test User");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileDto.UpdateRequest req = new ProfileDto.UpdateRequest(
                "Test User",
                "12345", // invalid format
                null,
                null
        );

        ApiException ex = assertThrows(ApiException.class, () -> profileService.updateProfile(userId, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Số điện thoại không hợp lệ"));
    }

    @Test
    void updateProfileRejectsDuplicatePhone() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setName("Test User");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByPhoneNumberAndUserIdNot("0901234567", userId)).thenReturn(true);

        ProfileDto.UpdateRequest req = new ProfileDto.UpdateRequest(
                "Test User",
                "0901234567",
                null,
                null
        );

        ApiException ex = assertThrows(ApiException.class, () -> profileService.updateProfile(userId, req));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Số điện thoại đã được sử dụng"));
    }

    @Test
    void changePasswordValidatesAndUpdatesHash() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setEmail("user@example.com");
        user.setPasswordHash("$2a$10$oldHash");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass123", "$2a$10$oldHash")).thenReturn(true);
        when(passwordEncoder.matches("newPass456", "$2a$10$oldHash")).thenReturn(false);
        when(passwordEncoder.encode("newPass456")).thenReturn("$2a$10$newHash");

        ProfileDto.ChangePasswordRequest req = new ProfileDto.ChangePasswordRequest("oldPass123", "newPass456");
        profileService.changePassword(userId, req);

        assertEquals("$2a$10$newHash", user.getPasswordHash());
        verify(userRepository).saveAndFlush(user);
        verify(auditLogService).record(eq(userId), eq("CHANGE_PASSWORD"), contains("user@example.com"), isNull());
    }

    @Test
    void changePasswordRejectsIncorrectCurrentPassword() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setPasswordHash("$2a$10$oldHash");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPass", "$2a$10$oldHash")).thenReturn(false);

        ProfileDto.ChangePasswordRequest req = new ProfileDto.ChangePasswordRequest("wrongPass", "newPass456");
        ApiException ex = assertThrows(ApiException.class, () -> profileService.changePassword(userId, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Mật khẩu hiện tại không chính xác"));
    }

    @Test
    void removeAvatarClearsAvatarAndAudits() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setAvatarUrl("https://example.com/avatar.png");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        ProfileDto.Response resp = profileService.removeAvatar(userId);

        assertNull(resp.avatarUrl());
        assertNull(user.getAvatarUrl());
        verify(auditLogService).record(eq(userId), eq("REMOVE_AVATAR"), anyString(), isNull());
    }
}
