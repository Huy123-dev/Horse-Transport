package com.equiflow.controller;

import com.equiflow.dto.InvoiceDto;
import com.equiflow.service.InvoiceService;
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
 * quyền sở hữu (customer chỉ xem hóa đơn của mình) kiểm tra trong InvoiceService.
 */
@RestController
@RequestMapping("/api")
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    /** Tạo hóa đơn cho yêu cầu đã phê duyệt (ADMIN / LOGISTICS_MANAGER) */
    @PostMapping("/invoices")
    public ResponseEntity<InvoiceDto.Response> create(@Valid @RequestBody InvoiceDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /** Danh sách theo quyền (lọc tùy chọn ?paymentStatus=UNPAID|PAID|REFUNDED) */
    @GetMapping("/invoices")
    public List<InvoiceDto.Response> getAll(@RequestParam(required = false) String paymentStatus,
                                            Authentication auth) {
        return service.findAll(userId(auth), isCustomer(auth), paymentStatus);
    }

    @GetMapping("/invoices/{id}")
    public InvoiceDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth));
    }

    /** Xem hóa đơn theo yêu cầu vận chuyển */
    @GetMapping("/transport-requests/{requestId}/invoice")
    public InvoiceDto.Response getByRequest(@PathVariable UUID requestId, Authentication auth) {
        return service.findByRequestId(requestId, userId(auth), isCustomer(auth));
    }

    /** Cập nhật trạng thái thanh toán (ADMIN / LOGISTICS_MANAGER) */
    @PatchMapping("/invoices/{id}/payment-status")
    public InvoiceDto.Response updatePaymentStatus(@PathVariable UUID id,
                                                   @Valid @RequestBody InvoiceDto.PaymentStatusRequest req) {
        return service.updatePaymentStatus(id, req);
    }

    /** Customer xem hóa đơn của mình (lọc tùy chọn ?paymentStatus=...) */
    @GetMapping("/my/invoices")
    public List<InvoiceDto.Response> my(@RequestParam(required = false) String paymentStatus, Authentication auth) {
        return service.findMine(userId(auth), paymentStatus);
    }
}
