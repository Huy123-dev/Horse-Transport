package com.equiflow.controller;

import com.equiflow.dto.BlacklistDto;
import com.equiflow.service.BlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/blacklist")
public class BlacklistController {

    private final BlacklistService blacklistService;

    public BlacklistController(BlacklistService blacklistService) {
        this.blacklistService = blacklistService;
    }

    // ================= CUSTOMER ENDPOINTS =================

    @GetMapping("/my-status")
    public BlacklistDto.CustomerStatusResponse getMyStatus(Authentication auth) {
        return blacklistService.getCustomerCurrentStatus((UUID) auth.getPrincipal());
    }

    @GetMapping("/my-history")
    public List<BlacklistDto.Response> getMyHistory(Authentication auth) {
        return blacklistService.getCustomerHistory((UUID) auth.getPrincipal());
    }

    @PostMapping("/my-payment-proof")
    public ResponseEntity<BlacklistDto.AppealResponse> submitPaymentProof(
            @Valid @RequestBody BlacklistDto.PaymentProofRequest req,
            Authentication auth
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(blacklistService.submitPaymentProof((UUID) auth.getPrincipal(), req));
    }

    @PostMapping("/my-appeal")
    public ResponseEntity<BlacklistDto.AppealResponse> submitAppeal(
            @Valid @RequestBody BlacklistDto.AppealRequest req,
            Authentication auth
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(blacklistService.submitAppeal((UUID) auth.getPrincipal(), req));
    }

    // ================= MANAGER ENDPOINTS =================

    @GetMapping("/stats")
    public BlacklistDto.StatsResponse getStats() {
        return blacklistService.getStats();
    }

    @GetMapping
    public List<BlacklistDto.Response> getList(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String status
    ) {
        return blacklistService.getBlacklistEntries(search, reason, status);
    }

    @GetMapping("/{id}")
    public BlacklistDto.Response getById(@PathVariable UUID id) {
        return blacklistService.getBlacklistById(id);
    }

    @GetMapping("/customer/{customerId}/history")
    public List<BlacklistDto.Response> getCustomerHistory(@PathVariable UUID customerId) {
        return blacklistService.getCustomerHistory(customerId);
    }

    @GetMapping("/appeals/pending")
    public List<BlacklistDto.AppealResponse> getPendingAppeals() {
        return blacklistService.getPendingAppeals();
    }

    @PostMapping
    public ResponseEntity<BlacklistDto.Response> create(
            @Valid @RequestBody BlacklistDto.CreateRequest req,
            Authentication auth,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(blacklistService.createBlacklist((UUID) auth.getPrincipal(), req, getClientIp(request)));
    }

    @PostMapping("/appeals/{appealId}/verify-payment")
    public BlacklistDto.AppealResponse verifyPayment(
            @PathVariable UUID appealId,
            @Valid @RequestBody BlacklistDto.VerifyPaymentRequest req,
            Authentication auth,
            HttpServletRequest request
    ) {
        return blacklistService.verifyPayment((UUID) auth.getPrincipal(), appealId, req, getClientIp(request));
    }

    @PostMapping("/appeals/{appealId}/review")
    public BlacklistDto.AppealResponse reviewAppeal(
            @PathVariable UUID appealId,
            @Valid @RequestBody BlacklistDto.ReviewAppealRequest req,
            Authentication auth,
            HttpServletRequest request
    ) {
        return blacklistService.reviewAppeal((UUID) auth.getPrincipal(), appealId, req, getClientIp(request));
    }

    @PostMapping("/{id}/reactivate")
    public BlacklistDto.Response reactivate(
            @PathVariable UUID id,
            @RequestBody(required = false) BlacklistDto.ReactivateRequest req,
            Authentication auth,
            HttpServletRequest request
    ) {
        return blacklistService.reactivateCustomer((UUID) auth.getPrincipal(), id, req, getClientIp(request));
    }

    private static String getClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
