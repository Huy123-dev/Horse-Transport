package com.equiflow.security;

import com.equiflow.controller.AuditLogController;
import com.equiflow.controller.RoleController;
import com.equiflow.controller.UserController;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.AuditLogService;
import com.equiflow.service.RoleService;
import com.equiflow.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {UserController.class, RoleController.class, AuditLogController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class})
class AdministrativeApiAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private UserService userService;

    @MockBean
    private RoleService roleService;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    void logisticsManagerCanReadUserRoleAndAuditManagementApis() throws Exception {
        when(userService.findAll()).thenReturn(List.of());
        when(roleService.findAll()).thenReturn(List.of());
        when(auditLogService.findAll(null, null, null, null, 0, 50)).thenReturn(List.of());

        mockMvc.perform(get("/api/users").with(user("manager").roles("LOGISTICS_MANAGER")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/roles").with(user("manager").roles("LOGISTICS_MANAGER")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/audit-logs").with(user("manager").roles("LOGISTICS_MANAGER")))
                .andExpect(status().isOk());

        verify(userService).findAll();
        verify(roleService).findAll();
        verify(auditLogService).findAll(null, null, null, null, 0, 50);
    }

    @Test
    void removedAdminRoleNoLongerAuthorizesManagementApis() throws Exception {
        mockMvc.perform(get("/api/users").with(user("legacy-admin").roles("ADMIN")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/roles").with(user("legacy-admin").roles("ADMIN")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/audit-logs").with(user("legacy-admin").roles("ADMIN")))
                .andExpect(status().isForbidden());
    }
}
