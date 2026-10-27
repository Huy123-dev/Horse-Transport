package com.equiflow.dto;

import java.math.BigDecimal;
import java.util.List;

public final class DashboardStatsDto {

    private DashboardStatsDto() {}

    public record Response(
            long totalTransportRequests,
            long inProgressPlans,
            long completedPlans,
            List<RevenueByCurrency> paidRevenueByCurrency
    ) {}

    public record RevenueByCurrency(String currency, BigDecimal amount) {}
}
