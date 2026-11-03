package com.equiflow.service;

import com.equiflow.dto.StallPricingDto;
import com.equiflow.entity.StallPricingConfig;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.StallPricingConfigRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class StallPricingService {

    private static final BigDecimal DEFAULT_SMALL_BASE = new BigDecimal("100.00");
    private static final BigDecimal DEFAULT_MEDIUM_MULT = new BigDecimal("1.50");
    private static final BigDecimal DEFAULT_LARGE_MULT = new BigDecimal("2.00");
    private static final BigDecimal DEFAULT_XL_MULT = new BigDecimal("1.50");

    private final StallPricingConfigRepository repository;
    private final UserRepository userRepository;

    public StallPricingService(StallPricingConfigRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public StallPricingDto.ConfigResponse getCurrentConfig() {
        StallPricingConfig config = getOrCreateCurrentConfig();
        return toDto(config);
    }

    @Transactional
    public StallPricingDto.ConfigResponse updateConfig(StallPricingDto.UpdateConfigRequest req, UUID managerId) {
        if (req.basePriceSmall().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Giá cơ sở chuồng không được âm");
        }
        if (req.mediumMultiplier().compareTo(BigDecimal.ZERO) <= 0
                || req.largeMultiplier().compareTo(BigDecimal.ZERO) <= 0
                || req.extraLargeMultiplier().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hệ số giá chuồng phải lớn hơn 0");
        }

        StallPricingConfig config = getOrCreateCurrentConfig();
        config.setBasePriceSmall(req.basePriceSmall().setScale(2, RoundingMode.HALF_UP));
        config.setMediumMultiplier(req.mediumMultiplier().setScale(2, RoundingMode.HALF_UP));
        config.setLargeMultiplier(req.largeMultiplier().setScale(2, RoundingMode.HALF_UP));
        config.setExtraLargeMultiplier(req.extraLargeMultiplier().setScale(2, RoundingMode.HALF_UP));

        if (req.smallLengthMeters() != null) config.setSmallLengthMeters(req.smallLengthMeters());
        if (req.smallWidthMeters() != null) config.setSmallWidthMeters(req.smallWidthMeters());
        if (req.mediumLengthMeters() != null) config.setMediumLengthMeters(req.mediumLengthMeters());
        if (req.mediumWidthMeters() != null) config.setMediumWidthMeters(req.mediumWidthMeters());
        if (req.largeLengthMeters() != null) config.setLargeLengthMeters(req.largeLengthMeters());
        if (req.largeWidthMeters() != null) config.setLargeWidthMeters(req.largeWidthMeters());
        if (req.extraLargeLengthMeters() != null) config.setExtraLargeLengthMeters(req.extraLargeLengthMeters());
        if (req.extraLargeWidthMeters() != null) config.setExtraLargeWidthMeters(req.extraLargeWidthMeters());

        if (req.active() != null) config.setActive(req.active());
        config.setUpdatedBy(managerId != null && userRepository.existsById(managerId) ? managerId : null);
        config.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));

        return toDto(repository.saveAndFlush(config));
    }

    public StallPricingConfig getOrCreateCurrentConfig() {
        return repository.findTopByActiveTrueOrderByUpdatedAtDesc().orElseGet(() -> {
            StallPricingConfig config = new StallPricingConfig();
            config.setBasePriceSmall(DEFAULT_SMALL_BASE);
            config.setMediumMultiplier(DEFAULT_MEDIUM_MULT);
            config.setLargeMultiplier(DEFAULT_LARGE_MULT);
            config.setExtraLargeMultiplier(DEFAULT_XL_MULT);
            config.setCurrency("USD");
            config.setActive(true);
            config.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
            return repository.saveAndFlush(config);
        });
    }

    public BigDecimal calculatePrice(String size, StallPricingConfig config) {
        if (size == null) return null;
        BigDecimal small = config.getBasePriceSmall().setScale(2, RoundingMode.HALF_UP);
        BigDecimal medium = small.multiply(config.getMediumMultiplier()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal large = medium.multiply(config.getLargeMultiplier()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal xl = large.multiply(config.getExtraLargeMultiplier()).setScale(2, RoundingMode.HALF_UP);

        return switch (size.toUpperCase()) {
            case "SMALL" -> small;
            case "MEDIUM" -> medium;
            case "LARGE" -> large;
            case "EXTRA_LARGE" -> xl;
            default -> null;
        };
    }

    public StallPricingDto.SizeDetail getSizeDetail(String size, StallPricingConfig config) {
        if (size == null) return null;
        return switch (size.toUpperCase()) {
            case "SMALL" -> new StallPricingDto.SizeDetail(
                    "SMALL", "Nhỏ (Small)", config.getSmallLengthMeters(), config.getSmallWidthMeters(),
                    formatDim(config.getSmallLengthMeters(), config.getSmallWidthMeters()), calculatePrice("SMALL", config));
            case "MEDIUM" -> new StallPricingDto.SizeDetail(
                    "MEDIUM", "Tiêu chuẩn (Medium)", config.getMediumLengthMeters(), config.getMediumWidthMeters(),
                    formatDim(config.getMediumLengthMeters(), config.getMediumWidthMeters()), calculatePrice("MEDIUM", config));
            case "LARGE" -> new StallPricingDto.SizeDetail(
                    "LARGE", "Lớn (Large)", config.getLargeLengthMeters(), config.getLargeWidthMeters(),
                    formatDim(config.getLargeLengthMeters(), config.getLargeWidthMeters()), calculatePrice("LARGE", config));
            case "EXTRA_LARGE" -> new StallPricingDto.SizeDetail(
                    "EXTRA_LARGE", "Rất lớn (Extra Large)", config.getExtraLargeLengthMeters(), config.getExtraLargeWidthMeters(),
                    formatDim(config.getExtraLargeLengthMeters(), config.getExtraLargeWidthMeters()), calculatePrice("EXTRA_LARGE", config));
            default -> null;
        };
    }

    private StallPricingDto.ConfigResponse toDto(StallPricingConfig c) {
        BigDecimal pSmall = c.getBasePriceSmall().setScale(2, RoundingMode.HALF_UP);
        BigDecimal pMedium = pSmall.multiply(c.getMediumMultiplier()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal pLarge = pMedium.multiply(c.getLargeMultiplier()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal pXl = pLarge.multiply(c.getExtraLargeMultiplier()).setScale(2, RoundingMode.HALF_UP);

        return new StallPricingDto.ConfigResponse(
                c.getConfigId(),
                c.getBasePriceSmall(),
                c.getMediumMultiplier(),
                c.getLargeMultiplier(),
                c.getExtraLargeMultiplier(),
                c.getCurrency(),
                c.isActive(),
                new StallPricingDto.SizeDetail(
                        "SMALL", "Small", c.getSmallLengthMeters(), c.getSmallWidthMeters(),
                        formatDim(c.getSmallLengthMeters(), c.getSmallWidthMeters()), pSmall),
                new StallPricingDto.SizeDetail(
                        "MEDIUM", "Medium", c.getMediumLengthMeters(), c.getMediumWidthMeters(),
                        formatDim(c.getMediumLengthMeters(), c.getMediumWidthMeters()), pMedium),
                new StallPricingDto.SizeDetail(
                        "LARGE", "Large", c.getLargeLengthMeters(), c.getLargeWidthMeters(),
                        formatDim(c.getLargeLengthMeters(), c.getLargeWidthMeters()), pLarge),
                new StallPricingDto.SizeDetail(
                        "EXTRA_LARGE", "Extra Large", c.getExtraLargeLengthMeters(), c.getExtraLargeWidthMeters(),
                        formatDim(c.getExtraLargeLengthMeters(), c.getExtraLargeWidthMeters()), pXl),
                c.getUpdatedBy(),
                c.getUpdatedAt()
        );
    }

    private static String formatDim(BigDecimal l, BigDecimal w) {
        return (l != null ? l.stripTrailingZeros().toPlainString() : "0") + " × "
                + (w != null ? w.stripTrailingZeros().toPlainString() : "0") + " m";
    }
}
