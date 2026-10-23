package com.equiflow.controller;

import com.equiflow.service.FileStorageService.StoredFile;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;

/** Trả file đã lưu về client: PDF và ảnh mở ngay trên trình duyệt, loại khác tải về. */
final class FileResponses {

    private FileResponses() {}

    static ResponseEntity<Resource> of(StoredFile f) {
        boolean inline = f.contentType().equals("application/pdf") || f.contentType().startsWith("image/");
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(f.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(f.resource());
    }
}
