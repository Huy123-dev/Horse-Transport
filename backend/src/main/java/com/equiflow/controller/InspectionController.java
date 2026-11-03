package com.equiflow.controller;

import com.equiflow.dto.InspectionDto;
import com.equiflow.service.InspectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.userId;

/**
 * Phân quyền theo vai trò khai báo trong SecurityConfig;
 * customer chỉ xem bản ghi thuộc yêu cầu của mình (kiểm tra trong InspectionService).
 */
@RestController
@RequestMapping("/api/inspections")
public class InspectionController {

    private final InspectionService service;

    public InspectionController(InspectionService service) {
        this.service = service;
    }

    /** Tạo bản ghi kiểm tra (người tạo được ghi là inspector) */
    @PostMapping
    public ResponseEntity<InspectionDto.Response> create(@Valid @RequestBody InspectionDto.CreateRequest req,
                                                         Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    /** Danh sách theo quyền (lọc tùy chọn ?status=PENDING|IN_PROGRESS|PASSED|FAILED) */
    @GetMapping
    public List<InspectionDto.Response> getAll(@RequestParam(required = false) String status, Authentication auth) {
        return service.findAll(userId(auth), isCustomer(auth), status);
    }

    @GetMapping("/{id}")
    public InspectionDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth));
    }

    /** Kiểm tra theo yêu cầu vận chuyển */
    @GetMapping("/request/{requestId}")
    public List<InspectionDto.Response> getByRequest(@PathVariable UUID requestId, Authentication auth) {
        return service.findByRequest(requestId, userId(auth), isCustomer(auth));
    }

    /** Cập nhật trạng thái kiểm dịch/thông quan (FAILED bắt buộc có lý do trong notes) */
    @PatchMapping("/{id}/status")
    public InspectionDto.Response updateStatus(@PathVariable UUID id,
                                               @Valid @RequestBody InspectionDto.StatusRequest req,
                                               Authentication auth) {
        return service.updateStatus(id, req, userId(auth));
    }
}
