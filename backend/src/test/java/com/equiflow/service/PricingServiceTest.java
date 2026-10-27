package com.equiflow.service;

import com.equiflow.dto.PricingDto;
import com.equiflow.entity.PricingItemConfig;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.TransportRequestPricingSelection;
import com.equiflow.entity.TransportRequestQuote;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.PricingItemConfigRepository;
import com.equiflow.repository.TransportRequestPricingSelectionRepository;
import com.equiflow.repository.TransportRequestQuoteLineRepository;
import com.equiflow.repository.TransportRequestQuoteRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private PricingItemConfigRepository configRepository;
    @Mock
    private TransportRequestPricingSelectionRepository selectionRepository;
    @Mock
    private TransportRequestQuoteRepository quoteRepository;
    @Mock
    private TransportRequestQuoteLineRepository quoteLineRepository;
    @Mock
    private TransportRequestRepository requestRepository;
    @Mock
    private RequestAccessService access;

    @InjectMocks
    private PricingService pricingService;

    @Test
    void missingPackagePriceIsNotTreatedAsFree() {
        when(configRepository.findAll()).thenReturn(List.of());

        PricingDto.QuoteResponse quote = pricingService.preview(
                new PricingDto.PreviewRequest("BASIC_TRANSPORT", List.of(), 2));

        assertFalse(quote.canConfirm());
        assertEquals(null, quote.totalAmount());
        assertEquals(List.of("Basic Transport"), quote.missingItems());
        assertFalse(quote.lines().get(0).priceConfigured());
    }

    @Test
    void zeroPriceIsAnExplicitlyConfiguredFreeItem() {
        PricingItemConfig freePackage = config("BASIC_TRANSPORT", "PER_REQUEST", "0.00");
        when(configRepository.findAll()).thenReturn(List.of(freePackage));

        PricingDto.QuoteResponse quote = pricingService.preview(
                new PricingDto.PreviewRequest("BASIC_TRANSPORT", List.of(), 1));

        assertTrue(quote.canConfirm());
        assertEquals(0, quote.totalAmount().compareTo(BigDecimal.ZERO));
        assertTrue(quote.lines().get(0).priceConfigured());
    }

    @Test
    void perHorseServiceIsMultipliedAndIncludedServiceIsNotChargedTwice() {
        PricingItemConfig packageConfig = config("BASIC_TRANSPORT", "PER_REQUEST", "100.00");
        packageConfig.setIncludedServiceCodes(Set.of("VETERINARY_SUPPORT"));
        PricingItemConfig serviceConfig = config("VETERINARY_SUPPORT", "PER_HORSE", "25.00");
        PricingItemConfig handling = config("ADDITIONAL_HANDLING", "PER_HORSE", "10.00");
        when(configRepository.findAll()).thenReturn(List.of(packageConfig, serviceConfig, handling));

        PricingDto.QuoteResponse quote = pricingService.preview(
                new PricingDto.PreviewRequest("BASIC_TRANSPORT",
                        List.of("VETERINARY_SUPPORT", "ADDITIONAL_HANDLING"), 2));

        assertTrue(quote.canConfirm());
        assertEquals(0, quote.totalAmount().compareTo(new BigDecimal("120.00")));
        assertEquals(3, quote.lines().size());
        assertTrue(quote.lines().get(1).includedInPackage());
        assertEquals(0, quote.lines().get(1).lineTotalUsd().compareTo(BigDecimal.ZERO));
        assertEquals(2, quote.lines().get(2).quantity());
        assertEquals(0, quote.lines().get(2).lineTotalUsd().compareTo(new BigDecimal("20.00")));
    }

    @Test
    void requiredServiceWithoutPricePreventsQuoteConfirmation() {
        PricingItemConfig packageConfig = config("BASIC_TRANSPORT", "PER_REQUEST", "100.00");
        PricingItemConfig requiredService = new PricingItemConfig();
        requiredService.setItemCode("VETERINARY_SUPPORT");
        requiredService.setRequired(true);
        when(configRepository.findAll()).thenReturn(List.of(packageConfig, requiredService));

        PricingDto.QuoteResponse quote = pricingService.preview(
                new PricingDto.PreviewRequest("BASIC_TRANSPORT", List.of(), 1));

        assertFalse(quote.canConfirm());
        assertEquals(List.of("Veterinary Support"), quote.missingItems());
        assertEquals(null, quote.totalAmount());
    }

    @Test
    void duplicateServiceSelectionIsRejected() {
        ApiException error = assertThrows(ApiException.class, () -> pricingService.preview(
                new PricingDto.PreviewRequest("BASIC_TRANSPORT",
                        List.of("VETERINARY_SUPPORT", "VETERINARY_SUPPORT"), 1)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
    }

    @Test
    void approvalStoresAnImmutableUsdQuoteSnapshot() {
        UUID requestId = java.util.UUID.randomUUID();
        UUID managerId = java.util.UUID.randomUUID();
        TransportRequest request = pendingRequest(requestId);
        when(requestRepository.findByIdForUpdate(requestId)).thenReturn(java.util.Optional.of(request));
        when(selectionRepository.findByRequestId(requestId)).thenReturn(List.of(selection(requestId, "BASIC_TRANSPORT")));
        when(configRepository.findAll()).thenReturn(List.of(config("BASIC_TRANSPORT", "PER_REQUEST", "125.00")));
        when(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)).thenReturn(java.util.Optional.empty());
        when(quoteRepository.saveAndFlush(any(TransportRequestQuote.class))).thenAnswer(invocation -> {
            TransportRequestQuote quote = invocation.getArgument(0);
            quote.setQuoteId(java.util.UUID.randomUUID());
            return quote;
        });
        when(requestRepository.saveAndFlush(request)).thenReturn(request);

        PricingDto.QuoteResponse preview = pricingService.preview(
                new PricingDto.PreviewRequest("BASIC_TRANSPORT", List.of(), 1));
        TransportRequest approved = pricingService.approveAndConfirmQuote(requestId, managerId, preview.fingerprint());

        assertEquals(TransportRequestService.APPROVED, approved.getStatus());
        assertEquals(0, approved.getEstimatedAmount().compareTo(new BigDecimal("125.00")));
        assertEquals("USD", approved.getCurrency());
        verify(quoteLineRepository).saveAll(any());
        verify(access).notify(request.getCustomerId(), "REQUEST_STATUS", "Đơn hàng đã được phê duyệt",
                "Báo giá 125.00 USD đã được xác nhận cho yêu cầu vận chuyển.",
                "transport_requests", requestId);
    }

    @Test
    void approvalRejectsAStalePreviewBeforePersistingAQuote() {
        UUID requestId = java.util.UUID.randomUUID();
        TransportRequest request = pendingRequest(requestId);
        when(requestRepository.findByIdForUpdate(requestId)).thenReturn(java.util.Optional.of(request));
        when(selectionRepository.findByRequestId(requestId)).thenReturn(List.of(selection(requestId, "BASIC_TRANSPORT")));
        when(configRepository.findAll()).thenReturn(List.of(config("BASIC_TRANSPORT", "PER_REQUEST", "125.00")));

        ApiException error = assertThrows(ApiException.class,
                () -> pricingService.approveAndConfirmQuote(requestId, java.util.UUID.randomUUID(), "stale"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(quoteRepository, never()).saveAndFlush(any());
        verify(requestRepository, never()).saveAndFlush(any());
    }

    private static PricingItemConfig config(String code, String unit, String price) {
        PricingItemConfig config = new PricingItemConfig();
        config.setItemCode(code);
        config.setUnitType(unit);
        config.setUnitPriceUsd(new BigDecimal(price));
        return config;
    }

    private static TransportRequest pendingRequest(UUID requestId) {
        TransportRequest request = new TransportRequest();
        request.setRequestId(requestId);
        request.setCustomerId(java.util.UUID.randomUUID());
        request.setStatus(TransportRequestService.PENDING);
        request.setCurrency("USD");
        request.setHorseIds(Set.of(java.util.UUID.randomUUID()));
        return request;
    }

    private static TransportRequestPricingSelection selection(UUID requestId, String code) {
        TransportRequestPricingSelection selection = new TransportRequestPricingSelection();
        selection.setRequestId(requestId);
        selection.setItemCode(code);
        return selection;
    }
}
