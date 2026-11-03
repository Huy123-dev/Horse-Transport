package com.equiflow.security;

import org.springframework.security.core.Authentication;

import java.util.UUID;

/** Tiện ích đọc thông tin người đăng nhập từ JWT (principal = userId, authority = ROLE_xxx). */
public final class AuthUtil {

    private AuthUtil() {}

    public static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    public static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"));
    }

    public static boolean isDriverEscort(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .anyMatch(CrewRoles::isCrewRole);
    }
}
