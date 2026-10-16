package com.equiflow.controller;

import com.equiflow.dto.IncidentDto;
import com.equiflow.service.IncidentService;
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
public class IncidentController {

    private final IncidentService service;

    public IncidentController(IncidentService service) {
        this.service = service;
    }

    /** Báo cáo sự cố (tài xế / người đi kèm của chuyến). */
    @PostMapping("/incidents")
    public ResponseEntity<IncidentDto.Response> create(@Valid @RequestBody IncidentDto.Request req,
                                                       Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    /** Danh sách sự cố, lọc tùy chọn ?status=OPEN|RESOLVED và ?sos=true|false. */
    @GetMapping("/incidents")
    public List<IncidentDto.Response> list(@RequestParam(required = false) String status,
                                           @RequestParam(required = false) Boolean sos,
                                           Authentication auth) {
        return service.findAll(userId(auth), isCustomer(auth), status, sos);
    }

    @GetMapping("/incidents/{id}")
    public IncidentDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth));
    }

    @GetMapping("/transport-plans/{planId}/incidents")
    public List<IncidentDto.Response> getByPlan(@PathVariable UUID planId, Authentication auth) {
        return service.findByPlan(planId, userId(auth), isCustomer(auth));
    }

    @PatchMapping("/incidents/{id}")
    public IncidentDto.Response update(@PathVariable UUID id, @Valid @RequestBody IncidentDto.UpdateRequest req,
                                       Authentication auth) {
        return service.update(id, req, userId(auth));
    }

    @PatchMapping("/incidents/{id}/resolve")
    public IncidentDto.Response resolve(@PathVariable UUID id, Authentication auth) {
        return service.resolve(id, userId(auth));
    }

    @PatchMapping("/incidents/{id}/approve-cost")
    public IncidentDto.Response approveCost(@PathVariable UUID id, Authentication auth) {
        return service.approveCost(id, userId(auth));
    }
}
