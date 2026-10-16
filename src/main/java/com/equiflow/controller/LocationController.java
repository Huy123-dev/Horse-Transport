package com.equiflow.controller;

import com.equiflow.dto.LocationRequest;
import com.equiflow.dto.LocationResponse;
import com.equiflow.service.LocationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** GET: mọi tài khoản đã đăng nhập; POST/PUT: nhân viên (khai báo trong SecurityConfig). */
@RestController
@RequestMapping("/api/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping
    public List<LocationResponse> getAll() {
        return locationService.findAll();
    }

    @GetMapping("/{id}")
    public LocationResponse getById(@PathVariable UUID id) {
        return locationService.findById(id);
    }

    @PostMapping
    public ResponseEntity<LocationResponse> create(@Valid @RequestBody LocationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.create(req));
    }

    @PutMapping("/{id}")
    public LocationResponse update(@PathVariable UUID id, @Valid @RequestBody LocationRequest req) {
        return locationService.update(id, req);
    }
}
