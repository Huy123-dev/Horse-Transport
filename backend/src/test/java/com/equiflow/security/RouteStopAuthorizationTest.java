package com.equiflow.security;

import com.equiflow.controller.RouteStopController;
import com.equiflow.dto.RouteStopDto;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.RouteStopService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RouteStopController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class})
class RouteStopAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private RouteStopService routeStopService;

    @Test
    void transportSpecialistCanAddRouteStopToAnExistingPlan() throws Exception {
        UUID planId = UUID.randomUUID();
        RouteStopDto.Request request = new RouteStopDto.Request(
                null, 1, "Điểm nghỉ", "REST", null, null, null, null, null);
        when(routeStopService.create(planId, request)).thenReturn(new RouteStopDto.Response(
                UUID.randomUUID(), planId, 1, null, null, null, "Điểm nghỉ", "REST",
                null, null, null, null, null));

        mockMvc.perform(post("/api/transport-plans/{planId}/stops", planId)
                        .with(user("specialist").roles("TRANSPORT_SPECIALIST"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sequenceNo":1,"stopName":"Điểm nghỉ","stopType":"REST"}
                                """))
                .andExpect(status().isCreated());

        verify(routeStopService).create(planId, request);
    }

    @Test
    void customerCannotAddRouteStop() throws Exception {
        mockMvc.perform(post("/api/transport-plans/{planId}/stops", UUID.randomUUID())
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sequenceNo":1,"stopName":"Điểm nghỉ","stopType":"REST"}
                                """))
                .andExpect(status().isForbidden());
    }
}
