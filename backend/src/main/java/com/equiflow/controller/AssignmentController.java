package com.equiflow.controller;

import com.equiflow.dto.AssignmentDto;
import com.equiflow.dto.MessageResponse;
import com.equiflow.service.AssignmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** API phân công tập trung trên bảng transport_assignments đang có. */
@RestController
@RequestMapping("/api")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @GetMapping("/transport-plans/{planId}/assignments")
    public List<AssignmentDto.Response> getByPlan(@PathVariable UUID planId) {
        return assignmentService.findByPlan(planId);
    }

    @GetMapping("/transport-plans/{planId}/assignment-options")
    public AssignmentDto.OptionsResponse getOptions(@PathVariable UUID planId) {
        return assignmentService.options(planId);
    }

    @PostMapping("/transport-plans/{planId}/assignments")
    public ResponseEntity<AssignmentDto.Response> create(
            @PathVariable UUID planId, @Valid @RequestBody AssignmentDto.Request req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.create(planId, req));
    }

    @PutMapping("/transport-assignments/{id}")
    public AssignmentDto.Response update(@PathVariable UUID id, @Valid @RequestBody AssignmentDto.Request req) {
        return assignmentService.update(id, req);
    }

    @DeleteMapping("/transport-assignments/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return assignmentService.delete(id);
    }
}
