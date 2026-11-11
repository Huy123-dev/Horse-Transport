package com.equiflow.controller;

import com.equiflow.dto.CompensationClaimDto;
import com.equiflow.service.CompensationClaimService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CompensationClaimController {

    private final CompensationClaimService service;

    public CompensationClaimController(CompensationClaimService service) {
        this.service = service;
    }

    @PostMapping("/transport-requests/{requestId}/compensation-claims")
    public ResponseEntity<CompensationClaimDto.Response> submit(
            @PathVariable UUID requestId, @Valid @RequestBody CompensationClaimDto.CreateRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.submit(requestId, userId(auth), request));
    }

    @GetMapping("/transport-requests/{requestId}/compensation-claims")
    public List<CompensationClaimDto.Response> findByRequest(@PathVariable UUID requestId, Authentication auth) {
        return service.findByRequest(requestId, userId(auth), isCustomer(auth));
    }

    @GetMapping("/compensation-claims")
    public List<CompensationClaimDto.Response> findAll() {
        return service.findAll();
    }

    @GetMapping("/compensation-claims/my")
    public List<CompensationClaimDto.Response> findMyClaims(Authentication auth) {
        return service.findMyClaims(userId(auth));
    }

    @PatchMapping("/compensation-claims/{claimId}/review")
    public CompensationClaimDto.Response review(@PathVariable UUID claimId,
                                               @Valid @RequestBody CompensationClaimDto.ReviewRequest request,
                                               Authentication auth) {
        return service.review(claimId, userId(auth), request);
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
