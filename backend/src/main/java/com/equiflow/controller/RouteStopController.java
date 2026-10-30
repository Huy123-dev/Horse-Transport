package com.equiflow.controller;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.RouteStopDto;
import com.equiflow.service.RouteStopService;
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
public class RouteStopController {

    private final RouteStopService service;

    public RouteStopController(RouteStopService service) {
        this.service = service;
    }

    @PostMapping("/transport-plans/{planId}/stops")
    public ResponseEntity<RouteStopDto.Response> create(@PathVariable UUID planId,
                                                        @Valid @RequestBody RouteStopDto.Request req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(planId, req));
    }

    @GetMapping("/transport-plans/{planId}/stops")
    public List<RouteStopDto.Response> getByPlan(@PathVariable UUID planId, Authentication auth) {
        return service.findByPlan(planId, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    @GetMapping("/route-stops/{id}")
    public RouteStopDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    @PutMapping("/route-stops/{id}")
    public RouteStopDto.Response update(@PathVariable UUID id, @Valid @RequestBody RouteStopDto.Request req) {
        return service.update(id, req);
    }

    @PatchMapping("/route-stops/{id}/status")
    public RouteStopDto.Response updateStatus(@PathVariable UUID id,
                                              @Valid @RequestBody RouteStopDto.StatusRequest req,
                                              Authentication auth) {
        return service.updateStatus(id, req, userId(auth), isDriverEscort(auth));
    }

    @DeleteMapping("/route-stops/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return service.delete(id);
    }
}
