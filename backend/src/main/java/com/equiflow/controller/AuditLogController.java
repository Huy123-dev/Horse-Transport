package com.equiflow.controller;

import com.equiflow.dto.AuditLogDto;
import com.equiflow.service.AuditLogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Chỉ Logistics Manager (khai báo trong SecurityConfig). */
@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService service;

    public AuditLogController(AuditLogService service) {
        this.service = service;
    }

    /**
     * Xem nhật ký hệ thống, mới nhất trước.
     * Lọc tùy chọn: ?userId=&action=&from=2026-10-01T00:00:00&to=2026-10-31T23:59:59&page=0&size=50
     */
    @GetMapping
    public List<AuditLogDto.Response> getAll(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return service.findAll(userId, action, from, to, page, size);
    }

    @GetMapping("/{id}")
    public AuditLogDto.Response getById(@PathVariable UUID id) {
        return service.findById(id);
    }
}
