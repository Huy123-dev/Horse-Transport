package com.equiflow.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public final class CompensationClaimDto {

    private CompensationClaimDto() {}

    public record CreateRequest(
            @Size(max = 50, message = "Nhóm tình huống tối đa 50 ký tự")
            String category,

            @Size(max = 20, message = "Mức độ ảnh hưởng tối đa 20 ký tự")
            String severity,

            @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự")
            String description,

            @DecimalMin(value = "0.00", inclusive = false, message = "Số tiền yêu cầu phải lớn hơn 0")
            @Digits(integer = 10, fraction = 2, message = "Số tiền tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal requestedAmount,

            @Size(max = 3, message = "Loại tiền tệ 3 ký tự (VD: USD)")
            String currency,

            @Size(max = 512, message = "Đường dẫn chứng cứ tối đa 512 ký tự")
            String evidenceUrl
    ) {}

    public record ReviewRequest(
            @NotBlank(message = "Vui lòng chọn trạng thái xử lý")
            @Pattern(
                    regexp = "^(APPROVED|PARTIALLY_APPROVED|REJECTED|UNDER_REVIEW|NEED_INFO|RESOLVED|CLOSED)$",
                    message = "Trạng thái xử lý không hợp lệ"
            )
            String status,

            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
            String decisionNote,

            @DecimalMin(value = "0.00", message = "Số tiền bồi thường duyệt không thể âm")
            @Digits(integer = 10, fraction = 2, message = "Số tiền tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal approvedAmount
    ) {}

    public record Response(
            UUID claimId,
            UUID requestId,
            String requestCode,
            UUID customerId,
            String customerName,
            String category,
            String categoryLabel,
            String severity,
            String description,
            BigDecimal requestedAmount,
            BigDecimal approvedAmount,
            String currency,
            String evidenceUrl,
            String status,
            String statusLabel,
            String decisionNote,
            LocalDateTime submittedAt,
            LocalDateTime reviewedAt,
            String reviewedByName
    ) {}
}
