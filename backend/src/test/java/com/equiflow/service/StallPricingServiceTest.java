package com.equiflow.service;

import com.equiflow.dto.StallPricingDto;
import com.equiflow.entity.StallPricingConfig;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.StallPricingConfigRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StallPricingServiceTest {

    @Mock
    private StallPricingConfigRepository repository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StallPricingService service;

    private StallPricingConfig defaultConfig;

    @BeforeEach
    void setUp() {
        defaultConfig = new StallPricingConfig();
        defaultConfig.setBasePriceSmall(new BigDecimal("100.00"));
        defaultConfig.setMediumMultiplier(new BigDecimal("1.50"));
        defaultConfig.setLargeMultiplier(new BigDecimal("2.00"));
        defaultConfig.setExtraLargeMultiplier(new BigDecimal("1.50"));
        defaultConfig.setCurrency("USD");
        defaultConfig.setActive(true);
    }

    @Test
    void calculatePriceCalculatesCorrectChainedMultipliers() {
        // Small = 100.00
        BigDecimal small = service.calculatePrice("SMALL", defaultConfig);
        assertEquals(0, small.compareTo(new BigDecimal("100.00")));

        // Medium = 100 * 1.5 = 150.00
        BigDecimal medium = service.calculatePrice("MEDIUM", defaultConfig);
        assertEquals(0, medium.compareTo(new BigDecimal("150.00")));

        // Large = 150 * 2.0 = 300.00
        BigDecimal large = service.calculatePrice("LARGE", defaultConfig);
        assertEquals(0, large.compareTo(new BigDecimal("300.00")));

        // Extra Large = 300 * 1.5 = 450.00
        BigDecimal xl = service.calculatePrice("EXTRA_LARGE", defaultConfig);
        assertEquals(0, xl.compareTo(new BigDecimal("450.00")));
    }

    @Test
    void getCurrentConfigReturnsAllSizesAndPrices() {
        when(repository.findTopByActiveTrueOrderByUpdatedAtDesc()).thenReturn(Optional.of(defaultConfig));

        StallPricingDto.ConfigResponse res = service.getCurrentConfig();
        assertNotNull(res);
        assertEquals(0, res.basePriceSmall().compareTo(new BigDecimal("100.00")));
        assertEquals("SMALL", res.small().size());
        assertEquals(0, res.small().priceUsd().compareTo(new BigDecimal("100.00")));
        assertEquals("MEDIUM", res.medium().size());
        assertEquals(0, res.medium().priceUsd().compareTo(new BigDecimal("150.00")));
        assertEquals("LARGE", res.large().size());
        assertEquals(0, res.large().priceUsd().compareTo(new BigDecimal("300.00")));
        assertEquals("EXTRA_LARGE", res.extraLarge().size());
        assertEquals(0, res.extraLarge().priceUsd().compareTo(new BigDecimal("450.00")));
    }

    @Test
    void updateConfigValidatesNegativePriceAndZeroMultiplier() {
        StallPricingDto.UpdateConfigRequest negReq = new StallPricingDto.UpdateConfigRequest(
                new BigDecimal("-50.00"), new BigDecimal("1.50"), new BigDecimal("2.00"), new BigDecimal("1.50"),
                null, null, null, null, null, null, null, null, true);

        ApiException err1 = assertThrows(ApiException.class, () -> service.updateConfig(negReq, UUID.randomUUID()));
        assertEquals(HttpStatus.BAD_REQUEST, err1.getStatus());

        StallPricingDto.UpdateConfigRequest zeroMultReq = new StallPricingDto.UpdateConfigRequest(
                new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("2.00"), new BigDecimal("1.50"),
                null, null, null, null, null, null, null, null, true);

        ApiException err2 = assertThrows(ApiException.class, () -> service.updateConfig(zeroMultReq, UUID.randomUUID()));
        assertEquals(HttpStatus.BAD_REQUEST, err2.getStatus());
    }

    @Test
    void updateConfigSavesSuccessfully() {
        when(repository.findTopByActiveTrueOrderByUpdatedAtDesc()).thenReturn(Optional.of(defaultConfig));
        when(repository.saveAndFlush(any(StallPricingConfig.class))).thenAnswer(i -> i.getArgument(0));

        StallPricingDto.UpdateConfigRequest update = new StallPricingDto.UpdateConfigRequest(
                new BigDecimal("120.00"), new BigDecimal("1.25"), new BigDecimal("1.80"), new BigDecimal("1.40"),
                null, null, null, null, null, null, null, null, true);

        StallPricingDto.ConfigResponse res = service.updateConfig(update, UUID.randomUUID());
        assertEquals(0, res.basePriceSmall().compareTo(new BigDecimal("120.00")));
        // Medium: 120 * 1.25 = 150.00
        assertEquals(0, res.medium().priceUsd().compareTo(new BigDecimal("150.00")));
        // Large: 150 * 1.80 = 270.00
        assertEquals(0, res.large().priceUsd().compareTo(new BigDecimal("270.00")));
        // Extra Large: 270 * 1.40 = 378.00
        assertEquals(0, res.extraLarge().priceUsd().compareTo(new BigDecimal("378.00")));
    }
}
