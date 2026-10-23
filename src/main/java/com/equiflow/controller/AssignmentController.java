package com.equiflow.controller;

import com.equiflow.dto.AssignmentDto;
import com.equiflow.dto.MessageResponse;
import com.equiflow.service.AssignmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController 
@RequestMapping("/api")
public class AssignmentController {

    private final AssignmentService service;

    public AssignmentController(AssignmentService service) {
        this.service = service;
    }

    @PostMapping("/transport-plans/{planId}/assignments")
    public ResponseEntity<AssignmentDto.Response> create(@PathVariable UUID planId,
                                                         @RequestBody AssignmentDto.Request req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(planId, req));
    }

    @GetMapping("/transport-plans/{planId}/assignments")
    public List<AssignmentDto.Response> getByPlan(@PathVariable UUID planId) {
        return service.findByPlan(planId);
    }

    @PutMapping("/assignments/{id}")
    public AssignmentDto.Response update(@PathVariable UUID id, @RequestBody AssignmentDto.Request req) {
        return service.update(id, req);
    }

    @DeleteMapping("/assignments/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return service.delete(id);
    }
}