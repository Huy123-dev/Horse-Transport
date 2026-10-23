package com.equiflow.controller;

import com.equiflow.dto.CustomsRegulationDto;
import com.equiflow.dto.MessageResponse;
import com.equiflow.service.CustomsRegulationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Phân quyền theo vai trò khai báo trong SecurityConfig. */
@RestController
@RequestMapping("/api/customs-regulations")
public class CustomsRegulationController {

    private final CustomsRegulationService service;

    public CustomsRegulationController(CustomsRegulationService service) {
        this.service = service;
    }

    /** Danh sách; lọc theo quốc gia: GET /api/customs-regulations?countryCode=JPN */
    @GetMapping
    public List<CustomsRegulationDto.Response> getAll(@RequestParam(required = false) String countryCode) {
        return service.findAll(countryCode);
    }

    @GetMapping("/{id}")
    public CustomsRegulationDto.Response getById(@PathVariable UUID id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<CustomsRegulationDto.Response> create(@Valid @RequestBody CustomsRegulationDto.Request req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public CustomsRegulationDto.Response update(@PathVariable UUID id,
                                                @Valid @RequestBody CustomsRegulationDto.Request req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return service.delete(id);
    }
}