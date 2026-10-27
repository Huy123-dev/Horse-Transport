package com.equiflow.security;

import com.equiflow.entity.User;
import com.equiflow.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockFilterChain;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtAuthFilterTest {

    private final JwtService jwtService = mock(JwtService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService, userRepository);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesCurrentDatabaseRoleInsteadOfStaleRoleInToken() throws Exception {
        UUID userId = UUID.randomUUID();
        Claims claims = claims(userId);
        User user = new User();
        user.setUserId(userId);
        user.setRoleId("LOGISTICS_MANAGER");
        user.setActive(true);
        when(jwtService.parse("valid-token")).thenReturn(claims);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        MockHttpServletRequest request = requestWithToken();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertEquals("ROLE_LOGISTICS_MANAGER", SecurityContextHolder.getContext()
                .getAuthentication().getAuthorities().iterator().next().getAuthority());
        verify(userRepository).findById(userId);
    }

    @Test
    void inactiveAccountDoesNotAuthenticateEvenWithValidToken() throws Exception {
        UUID userId = UUID.randomUUID();
        Claims claims = claims(userId);
        User user = new User();
        user.setUserId(userId);
        user.setRoleId("LOGISTICS_MANAGER");
        user.setActive(false);
        when(jwtService.parse("valid-token")).thenReturn(claims);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        filter.doFilter(requestWithToken(), new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private Claims claims(UUID userId) {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(claims.get("role", String.class)).thenReturn("CUSTOMER");
        return claims;
    }

    private static MockHttpServletRequest requestWithToken() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid-token");
        return request;
    }
}
