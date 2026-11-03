package com.equiflow.controller;

import com.equiflow.dto.TransportPlanDto;
import com.equiflow.service.TransportPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.isDriverEscort;
import static com.equiflow.security.AuthUtil.userId;

@RestController
@RequestMapping("/api")
public class TransportPlanController {

    private final TransportPlanService service;

    public TransportPlanController(TransportPlanService service) {
        this.service = service;
    }

    @PostMapping("/transport-plans")
    public ResponseEntity<TransportPlanDto.Response> create(@Valid @RequestBody TransportPlanDto.CreateRequest req,
                                                            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userId(auth)));
    }

    /** Danh sách theo quyền (lọc tùy chọn ?status=PLANNING|READY|IN_PROGRESS|COMPLETED|CANCELLED) */
    @GetMapping("/transport-plans")
    public List<TransportPlanDto.Response> getAll(@RequestParam(required = false) String status, Authentication auth) {
        return service.findAll(userId(auth), isCustomer(auth), isDriverEscort(auth), status);
    }

    @GetMapping("/transport-plans/{id}")
    public TransportPlanDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    /** Xem kế hoạch của một yêu cầu vận chuyển */
    @GetMapping("/transport-requests/{requestId}/plan")
    public TransportPlanDto.Response getByRequest(@PathVariable UUID requestId, Authentication auth) {
        return service.findByRequest(requestId, userId(auth), isCustomer(auth), isDriverEscort(auth));
    }

    @PutMapping("/transport-plans/{id}")
    public TransportPlanDto.Response update(@PathVariable UUID id,
                                            @Valid @RequestBody TransportPlanDto.UpdateRequest req,
                                            Authentication auth) {
        return service.update(id, req, userId(auth));
    }

    @PatchMapping("/transport-plans/{id}/status")
    public TransportPlanDto.Response updateStatus(@PathVariable UUID id,
                                                  @Valid @RequestBody TransportPlanDto.StatusRequest req) {
        return service.updateStatus(id, req);
    }
}
