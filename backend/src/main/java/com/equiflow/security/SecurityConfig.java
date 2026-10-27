package com.equiflow.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(a -> a
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

    .requestMatchers(
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/v3/api-docs/**"
    ).permitAll()

    .requestMatchers(
        HttpMethod.POST,
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/password-reset/request",
        "/api/auth/password-reset/confirm"
    ).permitAll()

    .requestMatchers("/api/notifications/**").authenticated()
    .requestMatchers(HttpMethod.GET, "/api/compensation-claims").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PATCH, "/api/compensation-claims/*/review").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/transport-requests/*/compensation-claims")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.POST, "/api/transport-requests/*/compensation-claims").hasRole("CUSTOMER")

    .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
    .requestMatchers(HttpMethod.POST, "/api/files/upload").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.POST, "/api/horses/images").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")

    .requestMatchers(HttpMethod.GET, "/api/horses/my-horses").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/horses", "/api/horses/*").hasAnyRole(
        "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER", "ESCORT", "DRIVER_ESCORT", "CUSTOMER")
    .requestMatchers(HttpMethod.POST, "/api/horses").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PUT, "/api/horses/*").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.DELETE, "/api/horses/*").hasAnyRole(
        "LOGISTICS_MANAGER")

    .requestMatchers("/api/users", "/api/users/**").hasRole("LOGISTICS_MANAGER")
    .requestMatchers("/api/roles", "/api/roles/*").hasRole("LOGISTICS_MANAGER")

    .requestMatchers(HttpMethod.POST, "/api/locations").hasAnyRole(
        "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PUT, "/api/locations/*").hasAnyRole(
        "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")

    .requestMatchers(HttpMethod.GET, "/api/quarantine-reservations", "/api/quarantine-reservations/*")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.POST, "/api/quarantine-reservations")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PUT, "/api/quarantine-reservations/*")
        .hasAnyRole("LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.DELETE, "/api/quarantine-reservations/*")
        .hasAnyRole("LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PATCH, "/api/quarantine-reservations/*/status")
        .hasAnyRole("LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")

    .requestMatchers(HttpMethod.POST, "/api/transport-requests").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/transport-requests/my").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/transport-requests", "/api/transport-requests/*",
        "/api/transport-requests/*/stalls").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.PATCH, "/api/transport-requests/*/cancel").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.PATCH, "/api/transport-requests/*/approve", "/api/transport-requests/*/reject")
        .hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/pricing/catalog").hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PUT, "/api/pricing/catalog/*").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.POST, "/api/pricing/quote-preview")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/transport-requests/*/quote")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PUT, "/api/transport-requests/*/pricing-selection")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")

    .requestMatchers(HttpMethod.POST, "/api/inspections").hasRole("TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PATCH, "/api/inspections/*/status").hasRole("TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.GET, "/api/inspections", "/api/inspections/*", "/api/inspections/request/*")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR")

    .requestMatchers(HttpMethod.GET, "/api/recovery-dashboard").hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.GET, "/api/dashboard/stats").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans/*/timeline")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans", "/api/transport-plans/*",
        "/api/transport-requests/*/plan", "/api/transport-plans/*/stops", "/api/route-stops/*",
        "/api/transport-plans/*/health-logs", "/api/horses/*/health-logs", "/api/health-logs/*",
        "/api/incidents", "/api/incidents/*", "/api/transport-plans/*/incidents",
        "/api/transport-plans/*/tracking", "/api/transport-plans/*/tracking/latest",
        "/api/deliveries/*", "/api/transport-plans/*/delivery")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR",
            "DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.POST, "/api/transport-plans").hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.PUT, "/api/transport-plans/*").hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.PATCH, "/api/transport-plans/*/status").hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans/*/assignments")
        .hasAnyRole("LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans/*/assignment-options")
        .hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.POST, "/api/transport-plans/*/assignments")
        .hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.PUT, "/api/transport-assignments/*")
        .hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.DELETE, "/api/transport-assignments/*")
        .hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.POST, "/api/transport-plans/*/stops")
        .hasAnyRole("FLEET_COORDINATOR", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PUT, "/api/route-stops/*")
        .hasAnyRole("FLEET_COORDINATOR", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.DELETE, "/api/route-stops/*")
        .hasAnyRole("FLEET_COORDINATOR", "TRANSPORT_SPECIALIST")

    .requestMatchers(HttpMethod.GET, "/api/transport-assets", "/api/transport-assets/*")
        .hasAnyRole("LOGISTICS_MANAGER", "FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.POST, "/api/transport-assets").hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.PUT, "/api/transport-assets/*").hasRole("FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.DELETE, "/api/transport-assets/*").hasRole("FLEET_COORDINATOR")
    
    .requestMatchers(HttpMethod.POST, "/api/horses/*/documents").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.GET, "/api/horses/*/documents", "/api/documents/*",
        "/api/documents/*/file").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR",
        "DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.PUT, "/api/documents/*").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.DELETE, "/api/documents/*").hasAnyRole(
        "CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
        
    .requestMatchers(HttpMethod.POST, "/api/tracking").hasAnyRole("DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans/*/tracking",
        "/api/transport-plans/*/tracking/latest")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR",
            "DRIVER", "ESCORT", "DRIVER_ESCORT")

    .requestMatchers(HttpMethod.POST, "/api/health-logs").hasAnyRole("DRIVER", "ESCORT", "DRIVER_ESCORT", "CUSTOMER")
    
    .requestMatchers(HttpMethod.POST, "/api/incidents").hasAnyRole("DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/approve-cost").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PATCH, "/api/incidents/*", "/api/incidents/*/resolve")
        .hasAnyRole("LOGISTICS_MANAGER", "FLEET_COORDINATOR", "DRIVER", "ESCORT", "DRIVER_ESCORT")
    
    .requestMatchers(HttpMethod.POST, "/api/invoices").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/my/invoices").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/invoices", "/api/invoices/*", "/api/transport-requests/*/invoice")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PATCH, "/api/invoices/*/payment-status").hasRole("LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PUT, "/api/invoices/*/pay").hasRole("LOGISTICS_MANAGER")

    .requestMatchers(HttpMethod.POST, "/api/deliveries").hasAnyRole("DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.GET, "/api/deliveries/*", "/api/transport-plans/*/delivery")
        .hasAnyRole("CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR",
            "DRIVER", "ESCORT", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.PATCH, "/api/transport-plans/*/complete")
        .hasAnyRole("LOGISTICS_MANAGER", "FLEET_COORDINATOR", "DRIVER", "ESCORT", "DRIVER_ESCORT")

    
    .requestMatchers(HttpMethod.GET, "/api/audit-logs", "/api/audit-logs/*").hasRole("LOGISTICS_MANAGER")
    .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(origins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }
}
