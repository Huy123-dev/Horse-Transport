package com.equiflow.controller;

import com.equiflow.service.FileStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Map;

@RestController
public class FileUploadController {

    private final FileStorageService storage;

    public FileUploadController(FileStorageService storage) {
        this.storage = storage;
    }

    @PostMapping(value = "/api/files/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String key = storage.storePublic(file);
        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .pathSegment("uploads", key)
                .toUriString();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", url));
    }

    @PostMapping(value = "/api/horses/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadHorseImage(@RequestParam("file") MultipartFile file) {
        String key = storage.storeHorseImage(file);
        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .pathSegment("uploads", key)
                .toUriString();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", url));
    }
}
