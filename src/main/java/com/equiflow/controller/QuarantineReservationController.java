package com.equiflow.controller;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.QuarantineReservationDto;
import com.equiflow.service.QuarantineReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.userId;

@RestController
@RequestMapping("/api/quarantine-reservations")
public class QuarantineReservationController {

    private final QuarantineReservationService service;

    public QuarantineReservationController(QuarantineReservationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<QuarantineReservationDto.Response> create(
            @Valid @RequestBody QuarantineReservationDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /** Danh sách theo quyền (lọc tùy chọn ?status=PENDING|CONFIRMED|IN_QUARANTINE|COMPLETED|CANCELLED) */
    @GetMapping
    public List<QuarantineReservationDto.Response> getAll(@RequestParam(required = false) String status,
                                                          Authentication auth) {
        return service.findAll(userId(auth), isCustomer(auth), status);
    }

    @GetMapping("/{id}")
    public QuarantineReservationDto.Response getById(@PathVariable UUID id, Authentication auth) {
        return service.findById(id, userId(auth), isCustomer(auth));
    }

    @PutMapping("/{id}")
    public QuarantineReservationDto.Response update(@PathVariable UUID id,
                                                    @Valid @RequestBody QuarantineReservationDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return service.delete(id);
    }

    @PatchMapping("/{id}/status")
    public QuarantineReservationDto.Response updateStatus(@PathVariable UUID id,
                                                          @Valid @RequestBody QuarantineReservationDto.StatusRequest req) {
        return service.updateStatus(id, req);
    }
}
