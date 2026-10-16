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

    // Swagger
    .requestMatchers(
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/v3/api-docs/**"
    ).permitAll()

    // Auth
    .requestMatchers(
        HttpMethod.POST,
        "/api/auth/register",
        "/api/auth/login"
    ).permitAll()

    // Horses: CUSTOMER xem ngựa của mình; nhân viên quản lý toàn bộ.
    // Quyền sở hữu (khách hàng chỉ sửa ngựa của mình) được kiểm tra thêm trong HorseService.
    .requestMatchers(HttpMethod.GET, "/api/horses/my-horses").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/horses", "/api/horses/*").hasAnyRole(
        "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER_ESCORT", "CUSTOMER")
    .requestMatchers(HttpMethod.POST, "/api/horses").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.PUT, "/api/horses/*").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.DELETE, "/api/horses/*").hasAnyRole(
        "ADMIN", "LOGISTICS_MANAGER")

    // Tài khoản & vai trò: chỉ ADMIN
    .requestMatchers("/api/users", "/api/users/*", "/api/roles", "/api/roles/*").hasAnyRole("ADMIN", "CUSTOMER")

    // Địa điểm: GET cho mọi tài khoản đã đăng nhập (khách chọn điểm đi/đến); POST/PUT chỉ nhân viên
    .requestMatchers(HttpMethod.POST, "/api/locations").hasAnyRole(
        "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "CUSTOMER")
    .requestMatchers(HttpMethod.PUT, "/api/locations/*").hasAnyRole(
        "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "CUSTOMER")

    // Transport requests: CUSTOMER tạo/xem yêu cầu của mình; quản lý xem tất cả; chỉ LOGISTICS_MANAGER/ADMIN duyệt.
    // Lưu ý: "/my" phải khai báo trước "/*" (rule khớp đầu tiên được áp dụng).
    .requestMatchers(HttpMethod.POST, "/api/transport-requests").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/transport-requests/my").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/transport-requests", "/api/transport-requests/*").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR")
    .requestMatchers(HttpMethod.PATCH, "/api/transport-requests/*/approve", "/api/transport-requests/*/reject")
        .hasAnyRole("ADMIN", "LOGISTICS_MANAGER", "CUSTOMER")
    
    // Horse documents: CUSTOMER chỉ thao tác trên ngựa của mình (kiểm tra trong HorseDocumentService).
    // Nhân viên thủ tục/quản lý được thêm-sửa; chỉ đọc cho điều phối viên và tài xế. Xóa: customer (có điều kiện) + nhân viên thủ tục.
    .requestMatchers(HttpMethod.POST, "/api/horses/*/documents").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.GET, "/api/horses/*/documents", "/api/documents/*",
        "/api/documents/*/file").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.PUT, "/api/documents/*").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
    .requestMatchers(HttpMethod.DELETE, "/api/documents/*").hasAnyRole(
        "CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST")
        
    // Các API còn lại phải đăng nhập
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
