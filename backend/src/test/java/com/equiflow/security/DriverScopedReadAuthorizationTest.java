package com.equiflow.security;

import com.equiflow.controller.HealthLogController;
import com.equiflow.controller.IncidentController;
import com.equiflow.controller.RouteStopController;
import com.equiflow.controller.TrackingController;
import com.equiflow.controller.DeliveryController;
import com.equiflow.controller.TransportPlanController;
import com.equiflow.dto.DeliveryDto;
import com.equiflow.dto.TrackingDto;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.DeliveryService;
import com.equiflow.service.HealthLogService;
import com.equiflow.service.IncidentService;
import com.equiflow.service.RouteStopService;
import com.equiflow.service.TrackingService;
import com.equiflow.service.TransportPlanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        TransportPlanController.class,
        RouteStopController.class,
        HealthLogController.class,
        IncidentController.class,
        TrackingController.class,
        DeliveryController.class
})
@Import({SecurityConfig.class, JwtAuthFilter.class})
class DriverScopedReadAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private TransportPlanService transportPlanService;

    @MockBean
    private RouteStopService routeStopService;

    @MockBean
    private HealthLogService healthLogService;

    @MockBean
    private IncidentService incidentService;

    @MockBean
    private TrackingService trackingService;

    @MockBean
    private DeliveryService deliveryService;

    @Test
    void driverCanReadTheAssignmentScopedPlanAndActivityRoutes() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID stopId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        UUID healthLogId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();
        UUID deliveryId = UUID.randomUUID();
        when(transportPlanService.findAll(userId, false, true, null)).thenReturn(List.of());
        when(routeStopService.findByPlan(planId, userId, false, true)).thenReturn(List.of());
        when(healthLogService.findByPlan(planId, userId, false, true)).thenReturn(List.of());
        when(healthLogService.findByHorse(horseId, userId, false, true)).thenReturn(List.of());
        when(incidentService.findAll(userId, false, true, null, null)).thenReturn(List.of());
        when(incidentService.findByPlan(planId, userId, false, true)).thenReturn(List.of());
        TrackingDto.Response tracking = new TrackingDto.Response(UUID.randomUUID(), planId, "Departed",
                BigDecimal.ONE, BigDecimal.ONE, LocalDateTime.now(), userId, "Driver");
        DeliveryDto.Response delivery = new DeliveryDto.Response(deliveryId, planId, "Recipient", "https://example.test/signature",
                LocalDateTime.now(), null);
        when(trackingService.findByPlan(planId, userId, false, true)).thenReturn(List.of(tracking));
        when(trackingService.findLatest(planId, userId, false, true)).thenReturn(tracking);
        when(deliveryService.findById(deliveryId, userId, false, true)).thenReturn(delivery);
        when(deliveryService.findByPlan(planId, userId, false, true)).thenReturn(delivery);

        mockMvc.perform(get("/api/transport-plans").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId).with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-requests/" + requestId + "/plan")
                        .with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId + "/stops").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/route-stops/" + stopId).with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId + "/health-logs").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/horses/" + horseId + "/health-logs").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/health-logs/" + healthLogId).with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/incidents").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/incidents/" + incidentId).with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId + "/incidents").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId + "/tracking").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId + "/tracking/latest").with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/deliveries/" + deliveryId).with(authentication(driver(userId))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/transport-plans/" + planId + "/delivery").with(authentication(driver(userId))))
                .andExpect(status().isOk());

        verify(transportPlanService).findAll(userId, false, true, null);
        verify(transportPlanService).findById(planId, userId, false, true);
        verify(transportPlanService).findByRequest(requestId, userId, false, true);
        verify(routeStopService).findByPlan(planId, userId, false, true);
        verify(routeStopService).findById(stopId, userId, false, true);
        verify(healthLogService).findByPlan(planId, userId, false, true);
        verify(healthLogService).findByHorse(horseId, userId, false, true);
        verify(healthLogService).findById(healthLogId, userId, false, true);
        verify(incidentService).findAll(userId, false, true, null, null);
        verify(incidentService).findById(incidentId, userId, false, true);
        verify(incidentService).findByPlan(planId, userId, false, true);
        verify(trackingService).findByPlan(planId, userId, false, true);
        verify(trackingService).findLatest(planId, userId, false, true);
        verify(deliveryService).findById(deliveryId, userId, false, true);
        verify(deliveryService).findByPlan(planId, userId, false, true);
    }

    @Test
    void driverCannotReadAssignmentManagementRoutes() throws Exception {
        UUID planId = UUID.randomUUID();

        mockMvc.perform(get("/api/transport-plans/" + planId + "/assignments").with(authentication(driver(UUID.randomUUID()))))
                .andExpect(status().isForbidden());
    }

    private static UsernamePasswordAuthenticationToken driver(UUID userId) {
        return new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_DRIVER_ESCORT")));
    }
}
