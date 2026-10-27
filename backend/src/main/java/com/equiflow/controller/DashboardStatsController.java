package com.equiflow.controller;

import com.equiflow.dto.DashboardStatsDto;
import com.equiflow.service.DashboardStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardStatsController {

    private final DashboardStatsService service;

    public DashboardStatsController(DashboardStatsService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public DashboardStatsDto.Response getStats() {
        return service.getStats();
    }
}
