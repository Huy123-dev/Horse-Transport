package com.equiflow.controller;

import com.equiflow.dto.ServiceFeedbackDto;
import com.equiflow.service.ServiceFeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ServiceFeedbackController {

    private final ServiceFeedbackService service;

    public ServiceFeedbackController(ServiceFeedbackService service) {
        this.service = service;
    }

    @PostMapping("/transport-requests/{requestId}/feedbacks")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ServiceFeedbackDto.Response> submitOrUpdate(
            @PathVariable UUID requestId,
            @Valid @RequestBody ServiceFeedbackDto.CreateRequest request,
            Authentication auth
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.submitOrUpdate(requestId, userId(auth), request));
    }

    @GetMapping("/transport-requests/{requestId}/feedback")
    public ResponseEntity<ServiceFeedbackDto.Response> getByRequestId(
            @PathVariable UUID requestId,
            Authentication auth
    ) {
        return service.findByRequestId(requestId, userId(auth), isCustomer(auth))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/feedbacks")
    @PreAuthorize("hasRole('LOGISTICS_MANAGER') or hasRole('SYSTEM_ADMIN')")
    public List<ServiceFeedbackDto.Response> findAll() {
        return service.findAll();
    }

    @GetMapping("/feedbacks/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<ServiceFeedbackDto.Response> findMyFeedbacks(Authentication auth) {
        return service.findMyFeedbacks(userId(auth));
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
