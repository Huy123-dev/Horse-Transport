package com.equiflow.controller;

import com.equiflow.dto.PricingDto;
import com.equiflow.service.PricingService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class PricingController {

    private final PricingService pricingService;

    public PricingController(PricingService pricingService) {
        this.pricingService = pricingService;
    }

    @GetMapping("/pricing/catalog")
    public List<PricingDto.CatalogItem> catalog() {
        return pricingService.catalog();
    }

    @PutMapping("/pricing/catalog/{code}")
    public PricingDto.CatalogItem updateItem(@PathVariable String code,
                                             @Valid @RequestBody PricingDto.UpdateItemRequest request,
                                             Authentication authentication) {
        return pricingService.updateItem(code, request, userId(authentication));
    }

    @PostMapping("/pricing/quote-preview")
    public PricingDto.QuoteResponse preview(@Valid @RequestBody PricingDto.PreviewRequest request) {
        return pricingService.preview(request);
    }

    @GetMapping("/transport-requests/{id}/quote")
    public PricingDto.QuoteResponse quote(@PathVariable UUID id, Authentication authentication) {
        return pricingService.quoteForRequest(id, userId(authentication), isCustomer(authentication));
    }

    @PutMapping("/transport-requests/{id}/pricing-selection")
    public PricingDto.QuoteResponse saveSelection(@PathVariable UUID id,
                                                  @Valid @RequestBody PricingDto.SelectionRequest selection,
                                                  Authentication authentication) {
        return pricingService.saveSelection(id, userId(authentication), isCustomer(authentication), selection);
    }

    private static UUID userId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }

    private static boolean isCustomer(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
