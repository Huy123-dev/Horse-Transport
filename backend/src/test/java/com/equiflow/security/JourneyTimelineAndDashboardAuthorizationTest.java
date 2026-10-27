package com.equiflow.security;

import com.equiflow.controller.DashboardStatsController;
import com.equiflow.controller.JourneyTimelineController;
import com.equiflow.dto.DashboardStatsDto;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.DashboardStatsService;
import com.equiflow.service.JourneyTimelineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {JourneyTimelineController.class, DashboardStatsController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class})
class JourneyTimelineAndDashboardAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JourneyTimelineService timelineService;

    @MockBean
    private DashboardStatsService dashboardStatsService;

    @Test
    void customerAndManagerCanReadTimelineButDriverCannot() throws Exception {
        UUID planId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        when(timelineService.getTimeline(planId, customerId, true)).thenReturn(List.of());
        when(timelineService.getTimeline(planId, managerId, false)).thenReturn(List.of());

        mockMvc.perform(get("/api/transport-plans/{id}/timeline", planId)
                        .with(authentication(authFor(customerId, "CUSTOMER"))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/{id}/timeline", planId)
                        .with(authentication(authFor(managerId, "LOGISTICS_MANAGER"))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/{id}/timeline", planId)
                        .with(authentication(authFor(UUID.randomUUID(), "DRIVER_ESCORT"))))
                .andExpect(status().isForbidden());

        verify(timelineService).getTimeline(planId, customerId, true);
        verify(timelineService).getTimeline(planId, managerId, false);
    }

    @Test
    void dashboardStatsAreOnlyAvailableToLogisticsManager() throws Exception {
        DashboardStatsDto.Response response = new DashboardStatsDto.Response(
                12, 2, 5, List.of(new DashboardStatsDto.RevenueByCurrency("USD", new BigDecimal("1250.00"))));
        when(dashboardStatsService.getStats()).thenReturn(response);

        mockMvc.perform(get("/api/dashboard/stats")
                        .with(authentication(authFor(UUID.randomUUID(), "LOGISTICS_MANAGER"))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/dashboard/stats")
                        .with(authentication(authFor(UUID.randomUUID(), "CUSTOMER"))))
                .andExpect(status().isForbidden());

        verify(dashboardStatsService).getStats();
    }

    private static UsernamePasswordAuthenticationToken authFor(UUID userId, String role) {
        return new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }
}
