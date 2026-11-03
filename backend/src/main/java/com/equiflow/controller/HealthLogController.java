package com.equiflow.controller;

import com.equiflow.dto.HealthLogDto;
import com.equiflow.service.HealthLogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.isDriverEscort;
import static com.equiflow.security.AuthUtil.userId;

@RestController
@RequestMapping("/api")
public class HealthLogController {

    private final HealthLogService service;

    public HealthLogController(HealthLogService service) {
        this.service = service;
    }

    /** Ghi nhận sức khỏe ngựa (tài xế / người đi kèm của chuyến). */
    @PostMapping("/health-logs")
    public ResponseEntity<HealthLogDto.Response> create(@Valid @RequestBody HealthLogDto.Request req,
                                                        Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    /** Nhật ký sức khỏe của chuyến (mới nhất trước). */
    @GetMapping("/transport-plans/{planId}/health-logs")
    public List<HealthLogDto.Response> getByPlan(@PathVariable UUID planId, Authentication auth) {
        return service.findByPlan(planId, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    /** Lịch sử sức khỏe của một con ngựa (mới nhất trước). */
    @GetMapping("/horses/{horseId}/health-logs")
    public List<HealthLogDto.Response> getByHorse(@PathVariable UUID horseId, Authentication auth) {
        return service.findByHorse(horseId, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    @GetMapping("/health-logs/{id}")
    public HealthLogDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }
}
