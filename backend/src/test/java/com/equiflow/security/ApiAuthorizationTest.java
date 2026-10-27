package com.equiflow.security;

import com.equiflow.controller.LocationController;
import com.equiflow.controller.QuarantineReservationController;
import com.equiflow.controller.AssignmentController;
import com.equiflow.dto.AssignmentDto;
import com.equiflow.dto.LocationResponse;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.AssignmentService;
import com.equiflow.service.LocationService;
import com.equiflow.service.QuarantineReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {LocationController.class, QuarantineReservationController.class, AssignmentController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class})
class ApiAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private LocationService locationService;

    @MockBean
    private QuarantineReservationService quarantineReservationService;

    @MockBean
    private AssignmentService assignmentService;

    @Test
    void customerCanReadLocations() throws Exception {
        when(locationService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/locations").with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotCreateOrUpdateSharedLocations() throws Exception {
        mockMvc.perform(post("/api/locations")
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/locations/" + UUID.randomUUID())
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void logisticsManagerCanCreateSharedLocation() throws Exception {
        LocationResponse response = new LocationResponse(
                UUID.randomUUID(), "Port", "PORT", BigDecimal.ZERO, BigDecimal.ZERO, 10, null, "VNM");
        when(locationService.create(org.mockito.ArgumentMatchers.any())).thenReturn(response);

        mockMvc.perform(post("/api/locations")
                        .with(user("manager").roles("LOGISTICS_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Port","type":"PORT","latitude":0,"longitude":0,"capacity":10,"countryCode":"VNM"}
                                """))
                .andExpect(status().isCreated());

        verify(locationService).create(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void customerCannotUpdateQuarantineReservation() throws Exception {
        mockMvc.perform(put("/api/quarantine-reservations/" + UUID.randomUUID())
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyFleetCoordinatorCanCreatePlanAssignments() throws Exception {
        UUID planId = UUID.randomUUID();
        AssignmentDto.Response response = new AssignmentDto.Response(
                UUID.randomUUID(), planId, null, null, null, null, null, null, null, null);
        when(assignmentService.create(org.mockito.ArgumentMatchers.eq(planId),
                org.mockito.ArgumentMatchers.any())).thenReturn(response);

        mockMvc.perform(post("/api/transport-plans/" + planId + "/assignments")
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/transport-plans/" + planId + "/assignments")
                        .with(user("coordinator").roles("FLEET_COORDINATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"assetId\":null,\"driverUserId\":null,\"attendantUserId\":null}"))
                .andExpect(status().isCreated());
    }
}
