package com.equiflow.controller;

import com.equiflow.dto.RecoveryDashboardDto;
import com.equiflow.service.RecoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.userId;

@RestController
@RequestMapping("/api")
@Tag(name = "Recovery Dashboard", description = "API theo dõi hồi phục và sức khỏe ngựa sau vận chuyển")
public class RecoveryController {

    private final RecoveryService recoveryService;

    public RecoveryController(RecoveryService recoveryService) {
        this.recoveryService = recoveryService;
    }

    @GetMapping("/recovery-dashboard")
    @Operation(summary = "Lấy dữ liệu tổng quan và chi tiết theo dõi hồi phục của ngựa")
    public RecoveryDashboardDto.Response getDashboard(Authentication auth) {
        return recoveryService.getRecoveryDashboard(userId(auth), isCustomer(auth));
    }
}
