package com.equiflow.controller;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.TransportAssetDto;
import com.equiflow.service.TransportAssetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transport-assets")
public class TransportAssetController {

    private final TransportAssetService service;

    public TransportAssetController(TransportAssetService service) {
        this.service = service;
    }

    /** Danh sách phương tiện (lọc tùy chọn ?status=AVAILABLE|MAINTENANCE|INACTIVE và ?type=TRUCK) */
    @GetMapping
    public List<TransportAssetDto.Response> getAll(@RequestParam(required = false) String status,
                                                   @RequestParam(required = false) String type) {
        return service.findAll(status, type);
    }

    @GetMapping("/{id}")
    public TransportAssetDto.Response getById(@PathVariable UUID id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<TransportAssetDto.Response> create(@Valid @RequestBody TransportAssetDto.Request req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public TransportAssetDto.Response update(@PathVariable UUID id, @Valid @RequestBody TransportAssetDto.Request req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return service.delete(id);
    }
}
