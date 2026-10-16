package com.equiflow.controller;

import com.equiflow.dto.HorseDocumentResponse;
import com.equiflow.dto.MessageResponse;
import com.equiflow.service.HorseDocumentService;
import com.equiflow.service.HorseDocumentService.FileDownload;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Phân quyền theo vai trò được khai báo trong SecurityConfig;
 * quyền sở hữu (customer chỉ thao tác hồ sơ của ngựa mình) được kiểm tra trong HorseDocumentService.
 * POST và PUT nhận multipart/form-data để chọn file trực tiếp từ máy.
 */
@RestController
public class HorseDocumentController {

    private final HorseDocumentService service;

    public HorseDocumentController(HorseDocumentService service) {
        this.service = service;
    }

    /** Tải file lên và thêm hồ sơ cho ngựa */
    @PostMapping(value = "/api/horses/{horseId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<HorseDocumentResponse> create(
            @PathVariable UUID horseId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam(value = "requestId", required = false) UUID requestId,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.create(horseId, documentType, expiryDate, requestId, file, userId(auth), isCustomer(auth)));
    }

    /** Xem hồ sơ của một con ngựa */
    @GetMapping("/api/horses/{horseId}/documents")
    public List<HorseDocumentResponse> getByHorse(@PathVariable UUID horseId, Authentication auth) {
        return service.findByHorse(horseId, userId(auth), isCustomer(auth));
    }

    /** Xem chi tiết hồ sơ */
    @GetMapping("/api/documents/{id}")
    public HorseDocumentResponse getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth));
    }

    /** Xem/tải file của hồ sơ (PDF và ảnh mở ngay trên trình duyệt, DOC/DOCX tải về) */
    @GetMapping("/api/documents/{id}/file")
    public ResponseEntity<Resource> download(@PathVariable UUID id, Authentication auth) {
        FileDownload f = service.download(id, userId(auth), isCustomer(auth));
        boolean inline = f.contentType().equals("application/pdf") || f.contentType().startsWith("image/");
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(f.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(f.resource());
    }

    /**
     * Cập nhật hồ sơ (multipart). Không gửi file thì chỉ đổi thông tin; gửi file mới thì thay file cũ.
     * Không gửi requestId / expiryDate nghĩa là bỏ liên kết / bỏ ngày hết hạn.
     */
    @PutMapping(value = "/api/documents/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public HorseDocumentResponse update(
            @PathVariable UUID id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam(value = "requestId", required = false) UUID requestId,
            Authentication auth) {
        return service.update(id, documentType, expiryDate, requestId, file, userId(auth), isCustomer(auth));
    }

    /** Xóa hồ sơ (và file) nếu được phép */
    @DeleteMapping("/api/documents/{id}")
    public MessageResponse delete(@PathVariable UUID id, Authentication auth) {
        return service.delete(id, userId(auth), isCustomer(auth));
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
