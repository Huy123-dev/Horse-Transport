package com.equiflow.service;

import com.equiflow.dto.UserCreateRequest;
import com.equiflow.dto.UserResponse;
import com.equiflow.dto.UserUpdateRequest;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, roleRepository, passwordEncoder, auditLogService);
    }

    private static Role createRole(String id, String name, String desc) {
        Role r = new Role();
        r.setRoleId(id);
        r.setRoleName(name);
        r.setDescription(desc);
        return r;
    }

    @Test
    void findCustomersReturnsOnlyCustomerRoleUsers() {
        User customer = new User();
        customer.setUserId(UUID.randomUUID());
        customer.setRoleId("CUSTOMER");
        customer.setName("Khách Hàng A");
        customer.setEmail("customer.a@example.com");

        User manager = new User();
        manager.setUserId(UUID.randomUUID());
        manager.setRoleId("LOGISTICS_MANAGER");
        manager.setName("Quản Lý B");
        manager.setEmail("manager.b@example.com");

        when(userRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(customer, manager));
        when(roleRepository.findAll()).thenReturn(List.of(
                createRole("CUSTOMER", "Khách hàng", "Customer role"),
                createRole("LOGISTICS_MANAGER", "Quản lý Logistics", "Manager role")
        ));

        List<UserResponse> result = userService.findCustomers();

        assertEquals(1, result.size());
        assertEquals("customer.a@example.com", result.get(0).email());
        assertEquals("CUSTOMER", result.get(0).roleId());
    }

    @Test
    void createUserEncodesPasswordAndRecordsAudit() {
        Role role = createRole("DRIVER", "Tài xế", "Driver");
        when(roleRepository.findById("DRIVER")).thenReturn(Optional.of(role));
        when(userRepository.existsByEmail("driver.new@example.com")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0909999888")).thenReturn(false);
        when(passwordEncoder.encode("secretPass123")).thenReturn("$2a$10$encodedSecret");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setUserId(UUID.randomUUID());
            u.setCreatedAt(LocalDateTime.now());
            u.setUpdatedAt(LocalDateTime.now());
            return u;
        });

        UserCreateRequest req = new UserCreateRequest(
                "Lê Văn Mới",
                "driver.new@example.com",
                "0909999888",
                "Equideli Transport",
                "secretPass123",
                "DRIVER",
                "DRIVER"
        );

        UserResponse resp = userService.create(req);

        assertNotNull(resp);
        assertEquals("Lê Văn Mới", resp.name());
        assertEquals("driver.new@example.com", resp.email());
        assertEquals("DRIVER", resp.staffType());
        verify(auditLogService).record(isNull(), eq("CREATE_USER"), contains("driver.new@example.com"), isNull());
    }

    @Test
    void setActiveUpdatesStatusAndRecordsAudit() {
        UUID currentUserId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        User user = new User();
        user.setUserId(targetUserId);
        user.setEmail("target@example.com");
        user.setRoleId("DRIVER");
        user.setActive(true);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserResponse resp = userService.setActive(targetUserId, false, currentUserId);

        assertFalse(resp.active());
        assertFalse(user.isActive());
        verify(auditLogService).record(eq(currentUserId), eq("DEACTIVATE_USER"), contains("target@example.com"), isNull());
    }

    @Test
    void setActivePreventsSelfDeactivation() {
        UUID currentUserId = UUID.randomUUID();

        User user = new User();
        user.setUserId(currentUserId);
        user.setEmail("manager@example.com");
        user.setRoleId("LOGISTICS_MANAGER");
        user.setActive(true);

        when(userRepository.findById(currentUserId)).thenReturn(Optional.of(user));

        ApiException ex = assertThrows(ApiException.class, () -> userService.setActive(currentUserId, false, currentUserId));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Không thể vô hiệu hóa tài khoản đang đăng nhập"));
    }

    @Test
    void setActiveProtectsLastActiveLogisticsManager() {
        UUID currentUserId = UUID.randomUUID();
        UUID otherManagerId = UUID.randomUUID();

        User otherManager = new User();
        otherManager.setUserId(otherManagerId);
        otherManager.setEmail("other.manager@example.com");
        otherManager.setRoleId("LOGISTICS_MANAGER");
        otherManager.setActive(true);

        when(userRepository.findById(otherManagerId)).thenReturn(Optional.of(otherManager));
        when(userRepository.countByRoleIdAndActiveTrue("LOGISTICS_MANAGER")).thenReturn(1L);

        ApiException ex = assertThrows(ApiException.class, () -> userService.setActive(otherManagerId, false, currentUserId));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Phải còn ít nhất một Logistics Manager đang hoạt động"));
    }
}
