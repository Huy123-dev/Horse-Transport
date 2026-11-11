package com.equiflow.security;

import com.equiflow.controller.AuthController;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.AuthService;
import com.equiflow.service.GoogleAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class})
class GoogleAuthEndpointAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuthService authService;

    @MockBean
    private GoogleAuthService googleAuthService;

    @Test
    void googleLoginIsPublicAndDelegatesToGoogleAuthService() throws Exception {
        when(googleAuthService.login(any())).thenReturn(null);

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"google-id-token\"}"))
                .andExpect(status().isOk());

        verify(googleAuthService).login(any());
    }
}
