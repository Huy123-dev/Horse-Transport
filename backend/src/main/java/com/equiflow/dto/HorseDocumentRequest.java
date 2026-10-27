package com.equiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Body dùng chung cho POST /api/horses/{horseId}/documents và PUT /api/documents/{id}.
 * fileUrl là đường dẫn tới file đã lưu ở nơi khác (S3, ...); API không nhận file trực tiếp.
 * PUT thay thế toàn bộ: không gửi requestId / expiryDate nghĩa là bỏ liên kết / bỏ ngày hết hạn.
 */
public record HorseDocumentRequest(
        @NotBlank(message = "Vui lòng nhập loại hồ sơ") @Size(max = 100, message = "Loại hồ sơ tối đa 100 ký tự") String documentType,
        @NotBlank(message = "Vui lòng nhập đường dẫn file")
        @Size(max = 512, message = "Đường dẫn file tối đa 512 ký tự")
        @Pattern(regexp = "^https?://\\S+$", message = "Đường dẫn file phải bắt đầu bằng http:// hoặc https://") String fileUrl,
        LocalDate expiryDate,
        UUID requestId
) {}
