package com.equiflow.repository;

import java.math.BigDecimal;

public interface PaidRevenueProjection {
    String getCurrency();
    BigDecimal getAmount();
}
