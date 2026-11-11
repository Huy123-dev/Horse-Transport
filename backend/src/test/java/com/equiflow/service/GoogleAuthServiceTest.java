package com.equiflow.service;

import com.equiflow.dto.AuthResponse;
import com.equiflow.dto.GoogleLoginRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private GoogleIdTokenVerifier verifier;

    @Mock
    private GoogleIdToken googleIdToken;

    private GoogleAuthService googleAuthService;

    @BeforeEach
    void setUp() {
        googleAuthService = new GoogleAuthService(
                userRepository,
                roleRepository,
                passwordEncoder,
                jwtService,
                "CUSTOMER",
                verifier
        );
    }

    @Test
    void loginFailsWhenVerifierNotConfigured() {
        GoogleAuthService unconfigured = new GoogleAuthService(
                userRepository, roleRepository, passwordEncoder, jwtService, "", "CUSTOMER"
        );

        ApiException ex = assertThrows(ApiException.class,
                () -> unconfigured.login(new GoogleLoginRequest("some-token")));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
    }

    @Test
    void loginFailsWhenTokenInvalidOrExpired() throws Exception {
        when(verifier.verify("invalid-token")).thenReturn(null);

        ApiException ex = assertThrows(ApiException.class,
                () -> googleAuthService.login(new GoogleLoginRequest("invalid-token")));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    void loginFailsWhenEmailNotVerified() throws Exception {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-123");
        payload.setEmail("test@gmail.com");
        payload.setEmailVerified(false);

        when(verifier.verify("unverified-token")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);

        ApiException ex = assertThrows(ApiException.class,
                () -> googleAuthService.login(new GoogleLoginRequest("unverified-token")));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("Email của tài khoản Google chưa được xác minh", ex.getMessage());
    }

    @Test
    void loginCreatesNewUserWhenNotExists() throws Exception {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-sub-999");
        payload.setEmail("newuser@gmail.com");
        payload.setEmailVerified(true);
        payload.set("name", "Nguyen Van New");

        when(verifier.verify("valid-token")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(userRepository.findByGoogleId("google-sub-999")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newuser@gmail.com")).thenReturn(Optional.empty());
        when(roleRepository.existsById("CUSTOMER")).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-secret");
        when(jwtService.generate(any(User.class))).thenReturn("jwt-token-xyz");
        when(jwtService.getExpirationMs()).thenReturn(86400000L);

        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setUserId(UUID.randomUUID());
            u.setActive(true);
            return u;
        });

        AuthResponse res = googleAuthService.login(new GoogleLoginRequest("valid-token"));

        assertNotNull(res);
        assertEquals("jwt-token-xyz", res.accessToken());
        assertEquals("Bearer", res.tokenType());
        assertEquals("newuser@gmail.com", res.user().email());
        assertEquals("Nguyen Van New", res.user().name());
        assertEquals("CUSTOMER", res.user().roleId());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertEquals("google-sub-999", userCaptor.getValue().getGoogleId());
        assertEquals("CUSTOMER", userCaptor.getValue().getRoleId());
    }

    @Test
    void loginLinksExistingUserWithSameEmail() throws Exception {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-sub-link");
        payload.setEmail("existing@gmail.com");
        payload.setEmailVerified(true);
        payload.set("name", "Existing User");

        User existingUser = new User();
        existingUser.setUserId(UUID.randomUUID());
        existingUser.setEmail("existing@gmail.com");
        existingUser.setName("Existing User");
        existingUser.setRoleId("CUSTOMER");
        existingUser.setActive(true);
        existingUser.setGoogleId(null);

        when(verifier.verify("valid-link-token")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(userRepository.findByGoogleId("google-sub-link")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("existing@gmail.com")).thenReturn(Optional.of(existingUser));
        when(jwtService.generate(existingUser)).thenReturn("jwt-token-linked");
        when(jwtService.getExpirationMs()).thenReturn(86400000L);

        AuthResponse res = googleAuthService.login(new GoogleLoginRequest("valid-link-token"));

        assertNotNull(res);
        assertEquals("jwt-token-linked", res.accessToken());
        assertEquals("google-sub-link", existingUser.getGoogleId());
        verify(userRepository).save(existingUser);
    }

    @Test
    void loginFailsWhenUserIsDeactivated() throws Exception {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-sub-deactivated");
        payload.setEmail("inactive@gmail.com");
        payload.setEmailVerified(true);

        User inactiveUser = new User();
        inactiveUser.setUserId(UUID.randomUUID());
        inactiveUser.setEmail("inactive@gmail.com");
        inactiveUser.setGoogleId("google-sub-deactivated");
        inactiveUser.setActive(false);

        when(verifier.verify("inactive-token")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(userRepository.findByGoogleId("google-sub-deactivated")).thenReturn(Optional.of(inactiveUser));

        ApiException ex = assertThrows(ApiException.class,
                () -> googleAuthService.login(new GoogleLoginRequest("inactive-token")));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("Tài khoản đã bị vô hiệu hóa", ex.getMessage());
        verify(jwtService, never()).generate(any());
    }

    @Test
    void loginFailsWhenEmailLinkedToDifferentGoogleAccount() throws Exception {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("google-sub-new");
        payload.setEmail("linked@gmail.com");
        payload.setEmailVerified(true);

        User alreadyLinkedUser = new User();
        alreadyLinkedUser.setUserId(UUID.randomUUID());
        alreadyLinkedUser.setEmail("linked@gmail.com");
        alreadyLinkedUser.setGoogleId("google-sub-original");
        alreadyLinkedUser.setActive(true);

        when(verifier.verify("token-mismatch")).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(userRepository.findByGoogleId("google-sub-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("linked@gmail.com")).thenReturn(Optional.of(alreadyLinkedUser));

        ApiException ex = assertThrows(ApiException.class,
                () -> googleAuthService.login(new GoogleLoginRequest("token-mismatch")));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("Email này đã liên kết với một tài khoản Google khác", ex.getMessage());
    }
}
