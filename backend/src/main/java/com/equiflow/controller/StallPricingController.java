package com.equiflow.controller;

import com.equiflow.dto.StallPricingDto;
import com.equiflow.service.StallPricingService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/pricing/stalls")
public class StallPricingController {

    private final StallPricingService stallPricingService;

    public StallPricingController(StallPricingService stallPricingService) {
        this.stallPricingService = stallPricingService;
    }

    @GetMapping
    public StallPricingDto.ConfigResponse getCurrentConfig() {
        return stallPricingService.getCurrentConfig();
    }

    @PutMapping
    @PreAuthorize("hasRole('LOGISTICS_MANAGER')")
    public StallPricingDto.ConfigResponse updateConfig(
            @Valid @RequestBody StallPricingDto.UpdateConfigRequest request,
            Authentication authentication) {
        UUID managerId = authentication != null && authentication.getPrincipal() instanceof UUID id ? id : null;
        return stallPricingService.updateConfig(request, managerId);
    }
}
