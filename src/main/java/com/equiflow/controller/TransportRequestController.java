package com.equiflow.controller;

import com.equiflow.dto.TransportRequestApproveRequest;
import com.equiflow.dto.TransportRequestCreateRequest;
import com.equiflow.dto.TransportRequestRejectRequest;
import com.equiflow.dto.TransportRequestResponse;
import com.equiflow.service.TransportRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Phân quyền theo vai trò được khai báo trong SecurityConfig;
 * quyền sở hữu (customer chỉ xem yêu cầu của mình) được kiểm tra trong TransportRequestService.
 */
@RestController
@RequestMapping("/api/transport-requests")
public class TransportRequestController {

    private final TransportRequestService service;

    public TransportRequestController(TransportRequestService service) {
        this.service = service;
    }

    /** Customer tạo yêu cầu */
    @PostMapping
    public ResponseEntity<TransportRequestResponse> create(@Valid @RequestBody TransportRequestCreateRequest req,
                                                           Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    /** Customer xem yêu cầu của mình (lọc tùy chọn ?status=PENDING|APPROVED|REJECTED|CANCELLED) */
    @GetMapping("/my")
    public List<TransportRequestResponse> my(@RequestParam(required = false) String status, Authentication auth) {
        return service.findMine(userId(auth), status);
    }

    /** Danh sách theo quyền: customer thấy của mình, nhân viên thấy tất cả */
    @GetMapping
    public List<TransportRequestResponse> getAll(@RequestParam(required = false) String status, Authentication auth) {
        return service.findAll(userId(auth), isCustomer(auth), status);
    }

    /** Xem chi tiết */
    @GetMapping("/{id}")
    public TransportRequestResponse getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth));
    }

    /** Manager phê duyệt (body không bắt buộc: có thể gửi estimatedAmount để báo giá) */
    @PatchMapping("/{id}/approve")
    public TransportRequestResponse approve(@PathVariable UUID id,
                                            @Valid @RequestBody(required = false) TransportRequestApproveRequest req,
                                            Authentication auth) {
        return service.approve(id, userId(auth), req == null ? null : req.estimatedAmount());
    }

    /** Manager từ chối (bắt buộc có lý do) */
    @PatchMapping("/{id}/reject")
    public TransportRequestResponse reject(@PathVariable UUID id,
                                           @Valid @RequestBody TransportRequestRejectRequest req) {
        return service.reject(id, req.reason());
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
