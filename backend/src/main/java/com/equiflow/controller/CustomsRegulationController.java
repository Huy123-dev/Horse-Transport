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

@RestController
@RequestMapping("/api/customs-regulations")
public class CustomsRegulationController {

    private final CustomsRegulationService service;

    public CustomsRegulationController(CustomsRegulationService service) {
        this.service = service;
    }

    /** Tra cứu danh sách quy định hải quan (tùy chọn lọc theo ?countryCode=JPN) */
    @GetMapping
    public List<CustomsRegulationDto.Response> getAll(@RequestParam(required = false) String countryCode) {
        return service.findAll(countryCode);
    }

    @GetMapping("/{id}")
    public CustomsRegulationDto.Response getById(@PathVariable UUID id) {
        return service.findById(id);
    }

    /** Chuyên viên hoặc Quản lý thêm mới quy định hải quan cho quốc gia */
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
