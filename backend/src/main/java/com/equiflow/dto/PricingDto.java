package com.equiflow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class PricingDto {

    private PricingDto() {}

    public record SelectionRequest(
            @NotBlank(message = "Vui lòng chọn gói vận chuyển") String packageCode,
            @Size(max = 8, message = "Chỉ được chọn tối đa 8 dịch vụ bổ sung")
            List<@NotBlank String> serviceCodes
    ) {}

    public record PreviewRequest(
            @NotBlank(message = "Vui lòng chọn gói vận chuyển") String packageCode,
            @Size(max = 8, message = "Chỉ được chọn tối đa 8 dịch vụ bổ sung")
            List<@NotBlank String> serviceCodes,
            @Min(value = 1, message = "Số ngựa phải lớn hơn 0") int horseCount,
            List<String> stallSizes
    ) {
        public PreviewRequest(String packageCode, List<String> serviceCodes, int horseCount) {
            this(packageCode, serviceCodes, horseCount, null);
        }
    }

    public record ApproveRequest(
            @NotBlank(message = "Vui lòng xác nhận bản xem trước báo giá đang hiển thị")
            @Size(max = 2048, message = "Mã xác nhận báo giá không hợp lệ") String previewFingerprint
    ) {}

    public record UpdateItemRequest(
            @Pattern(regexp = "PER_HORSE|PER_REQUEST|PER_TRIP",
                    message = "Đơn vị phải là PER_HORSE, PER_REQUEST hoặc PER_TRIP")
            String unitType,
            @DecimalMin(value = "0.00", message = "Giá không được âm")
            @Digits(integer = 10, fraction = 2, message = "Giá tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal priceUsd,
            @Size(max = 2000, message = "Quyền lợi tối đa 2000 ký tự") String benefits,
            @NotNull(message = "Vui lòng chọn trạng thái bắt buộc/tùy chọn") Boolean required,
            @Size(max = 8, message = "Chỉ được chọn tối đa 8 dịch vụ bao gồm")
            List<@NotBlank String> includedServiceCodes
    ) {}

    public record CatalogItem(
            String code,
            String name,
            String category,
            String benefits,
            BigDecimal priceUsd,
            String unitType,
            boolean required,
            List<String> includedServiceCodes,
            boolean priceConfigured,
            boolean unitConfigured,
            LocalDateTime updatedAt
    ) {}

    public record QuoteLine(
            String code,
            String name,
            String category,
            String benefits,
            String unitType,
            Integer quantity,
            BigDecimal unitPriceUsd,
            BigDecimal lineTotalUsd,
            boolean required,
            boolean includedInPackage,
            boolean priceConfigured,
            boolean unitConfigured
    ) {}

    public record QuoteResponse(
            String status,
            String currency,
            BigDecimal totalAmount,
            BigDecimal legacyAmount,
            String legacyCurrency,
            boolean canConfirm,
            List<String> missingItems,
            List<QuoteLine> lines,
            LocalDateTime confirmedAt,
            String packageCode,
            List<String> selectedServiceCodes,
            String fingerprint
    ) {}
}
