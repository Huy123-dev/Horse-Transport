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
    .requestMatchers("/api/users", "/api/users/*", "/api/roles", "/api/roles/*").hasAnyRole("ADMIN", "CUSTOMER", "LOGISTICS_MANAGER")

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
        
    // Tracking: chỉ tài xế/người đi kèm (DRIVER_ESCORT) ghi hành trình - phải thuộc phân công của kế hoạch (kiểm tra trong TrackingService).
    // Xem lịch sử / vị trí mới nhất: mọi vai trò; CUSTOMER chỉ xem kế hoạch của yêu cầu của mình (kiểm tra trong TrackingService).
    .requestMatchers(HttpMethod.POST, "/api/tracking").hasRole("DRIVER_ESCORT")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans/*/tracking", "/api/transport-plans/*/tracking/latest")
        .hasAnyRole("CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER_ESCORT")

    // Health logs: chỉ DRIVER_ESCORT ghi (phải thuộc phân công của kế hoạch - kiểm tra trong HealthLogService).
    // Xem: mọi vai trò; CUSTOMER chỉ xem ngựa/kế hoạch của mình (kiểm tra trong HealthLogService).
    .requestMatchers(HttpMethod.POST, "/api/health-logs").hasAnyRole("DRIVER_ESCORT","CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/transport-plans/*/health-logs", "/api/horses/*/health-logs", "/api/health-logs/*")
        .hasAnyRole("CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER_ESCORT")
    
    // Incidents: DRIVER_ESCORT báo cáo/cập nhật/đánh dấu đã xử lý sự cố của chuyến mình (kiểm tra phân công trong IncidentService).
    // Quản lý, điều phối viên cập nhật/xử lý mọi chuyến; chỉ ADMIN/LOGISTICS_MANAGER duyệt chi phí phát sinh.
    // Xem: mọi vai trò; CUSTOMER chỉ thấy sự cố thuộc yêu cầu của mình (kiểm tra trong IncidentService).
    .requestMatchers(HttpMethod.POST, "/api/incidents").hasRole("DRIVER_ESCORT")
    .requestMatchers(HttpMethod.GET, "/api/incidents", "/api/incidents/*", "/api/transport-plans/*/incidents")
        .hasAnyRole("CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/approve-cost").hasAnyRole("ADMIN", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PATCH, "/api/incidents/*", "/api/incidents/*/resolve")
        .hasAnyRole("ADMIN", "LOGISTICS_MANAGER", "FLEET_COORDINATOR", "DRIVER_ESCORT")
    
   // Invoices: chỉ ADMIN/LOGISTICS_MANAGER lập hóa đơn và cập nhật thanh toán.
    // Xem: CUSTOMER chỉ thấy hóa đơn của mình (kiểm tra trong InvoiceService); "/my" là API riêng của CUSTOMER.
    .requestMatchers(HttpMethod.POST, "/api/invoices").hasAnyRole("ADMIN", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.GET, "/api/my/invoices").hasRole("CUSTOMER")
    .requestMatchers(HttpMethod.GET, "/api/invoices", "/api/invoices/*", "/api/invoices/*/file",
        "/api/transport-requests/*/invoice")
        .hasAnyRole("CUSTOMER", "ADMIN", "LOGISTICS_MANAGER")
    .requestMatchers(HttpMethod.PATCH, "/api/invoices/*/payment-status").hasAnyRole("ADMIN", "LOGISTICS_MANAGER")

    // Deliveries: chỉ DRIVER_ESCORT ghi nhận bàn giao (phải thuộc phân công của kế hoạch - kiểm tra trong DeliveryService).
    // Hoàn tất chuyến: tài xế được phân công hoặc quản lý/điều phối viên. Xem: mọi vai trò; CUSTOMER chỉ xem chuyến của mình.
    .requestMatchers(HttpMethod.POST, "/api/deliveries").hasRole("DRIVER_ESCORT")
    .requestMatchers(HttpMethod.GET, "/api/deliveries/*", "/api/transport-plans/*/delivery")
        .hasAnyRole("CUSTOMER", "ADMIN", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR", "DRIVER_ESCORT")
    .requestMatchers(HttpMethod.PATCH, "/api/transport-plans/*/complete")
        .hasAnyRole("ADMIN", "LOGISTICS_MANAGER", "FLEET_COORDINATOR", "DRIVER_ESCORT")

    
    // Audit logs: chỉ ADMIN được xem nhật ký hệ thống.
    .requestMatchers(HttpMethod.GET, "/api/audit-logs", "/api/audit-logs/*").hasRole("LOGISTICS_MANAGER")
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
