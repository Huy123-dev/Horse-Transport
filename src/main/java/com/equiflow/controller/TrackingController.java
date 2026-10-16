package com.equiflow.controller;

import com.equiflow.dto.TrackingDto;
import com.equiflow.service.TrackingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.userId;

@RestController
@RequestMapping("/api")
public class TrackingController {

    private final TrackingService service;

    public TrackingController(TrackingService service) {
        this.service = service;
    }

    /** Driver cập nhật vị trí hoặc mốc hành trình. */
    @PostMapping("/tracking")
    public ResponseEntity<TrackingDto.Response> create(@Valid @RequestBody TrackingDto.Request req,
                                                       Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    /** Lịch sử hành trình (cũ -> mới). */
    @GetMapping("/transport-plans/{planId}/tracking")
    public List<TrackingDto.Response> history(@PathVariable UUID planId, Authentication auth) {
        return service.findByPlan(planId, userId(auth), isCustomer(auth));
    }

    /** Vị trí/mốc cập nhật mới nhất. */
    @GetMapping("/transport-plans/{planId}/tracking/latest")
    public TrackingDto.Response latest(@PathVariable UUID planId, Authentication auth) {
        return service.findLatest(planId, userId(auth), isCustomer(auth));
    }
}
