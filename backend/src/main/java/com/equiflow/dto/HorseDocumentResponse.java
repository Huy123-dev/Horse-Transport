package com.equiflow.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * fileUrl: với file tải lên là đường dẫn tương đối "/api/documents/{id}/file" (cần gửi kèm JWT để tải);
 * với dữ liệu cũ là liên kết ngoài https://... giữ nguyên.
 * fileName: tên file gốc người dùng đã chọn (null nếu là liên kết ngoài).
 */
public record HorseDocumentResponse(
        UUID documentId,
        UUID horseId,
        String horseName,
        UUID requestId,
        String documentType,
        String fileUrl,
        String fileName,
        LocalDate expiryDate,
        boolean expired,
        LocalDateTime uploadedAt
) {}
