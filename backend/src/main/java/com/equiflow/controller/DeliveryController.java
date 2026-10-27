package com.equiflow.controller;

import com.equiflow.dto.DeliveryDto;
import com.equiflow.dto.TransportPlanDto;
import com.equiflow.service.DeliveryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.isDriverEscort;
import static com.equiflow.security.AuthUtil.userId;

/**
 * Phân quyền theo vai trò khai báo trong SecurityConfig;
 * phân công của tài xế và quyền sở hữu của customer kiểm tra trong DeliveryService.
 */
@RestController
@RequestMapping("/api")
public class DeliveryController {

    private final DeliveryService service;

    public DeliveryController(DeliveryService service) {
        this.service = service;
    }

    /** Tài xế / người đi kèm ghi nhận bàn giao */
    @PostMapping("/deliveries")
    public ResponseEntity<DeliveryDto.Response> create(@Valid @RequestBody DeliveryDto.CreateRequest req,
                                                       Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    @GetMapping("/deliveries/{id}")
    public DeliveryDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    /** Xem bàn giao của chuyến */
    @GetMapping("/transport-plans/{planId}/delivery")
    public DeliveryDto.Response getByPlan(@PathVariable UUID planId, Authentication auth) {
        return service.findByPlan(planId, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    /** Hoàn tất chuyến đi (sau khi đã bàn giao) */
    @PatchMapping("/transport-plans/{id}/complete")
    public TransportPlanDto.Response complete(@PathVariable UUID id, Authentication auth) {
        return service.complete(id, userId(auth));
    }
}
