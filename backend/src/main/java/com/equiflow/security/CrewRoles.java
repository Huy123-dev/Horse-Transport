package com.equiflow.security;

import java.util.Set;

public final class CrewRoles {

    private static final String LEGACY_ROLE = "DRIVER_ESCORT";

    private CrewRoles() {}

    public static boolean isCrewRole(String roleId) {
        return "DRIVER".equals(roleId) || "ESCORT".equals(roleId) || LEGACY_ROLE.equals(roleId);
    }

    public static boolean canBeDriver(String roleId) {
        return "DRIVER".equals(roleId) || LEGACY_ROLE.equals(roleId);
    }

    public static boolean canBeEscort(String roleId) {
        return "ESCORT".equals(roleId) || LEGACY_ROLE.equals(roleId);
    }

    public static Set<String> allRoleIds() {
        return Set.of("DRIVER", "ESCORT", LEGACY_ROLE);
    }
}
