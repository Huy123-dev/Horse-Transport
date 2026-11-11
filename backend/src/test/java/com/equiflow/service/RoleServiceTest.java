package com.equiflow.service;

import com.equiflow.entity.Role;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private RoleService roleService;

    @Test
    void roleListDoesNotExposeTheRemovedAdminRole() {
        Role admin = role("ADMIN", "Administrator");
        Role manager = role("LOGISTICS_MANAGER", "Logistics Manager");
        when(roleRepository.findAll()).thenReturn(List.of(admin, manager));

        assertEquals(List.of("LOGISTICS_MANAGER"),
                roleService.findAll().stream().map(response -> response.roleId()).toList());
    }

    @Test
    void removedAdminRoleCannotBeLookedUp() {
        ApiException error = assertThrows(ApiException.class, () -> roleService.findById("admin"));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verifyNoInteractions(roleRepository);
    }

    private static Role role(String id, String name) {
        Role role = new Role();
        role.setRoleId(id);
        role.setRoleName(name);
        return role;
    }
}
