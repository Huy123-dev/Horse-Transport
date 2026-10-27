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
            @NotBlank(message = "Vui lòng mô tả nội dung yêu cầu bồi thường")
            @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự") String description,
            @DecimalMin(value = "0.00", inclusive = false, message = "Số tiền yêu cầu phải lớn hơn 0")
            @Digits(integer = 10, fraction = 2, message = "Số tiền tối đa 10 chữ số nguyên và 2 chữ số thập phân")
            BigDecimal requestedAmount,
            @Size(max = 512, message = "Đường dẫn chứng cứ tối đa 512 ký tự")
            @Pattern(regexp = "(?i)^https?://.+$", message = "Đường dẫn chứng cứ phải bắt đầu bằng http:// hoặc https://")
            String evidenceUrl
    ) {}

    public record ReviewRequest(
            @NotBlank @Pattern(regexp = "^(APPROVED|REJECTED)$") String status,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự") String decisionNote
    ) {}

    public record Response(
            UUID claimId,
            UUID requestId,
            String description,
            BigDecimal requestedAmount,
            String currency,
            String evidenceUrl,
            String status,
            String decisionNote,
            LocalDateTime submittedAt,
            LocalDateTime reviewedAt,
            String reviewedByName
    ) {}
}
