package com.equiflow.controller;

import com.equiflow.dto.HorseRequest;
import com.equiflow.dto.HorseResponse;
import com.equiflow.dto.MessageResponse;
import com.equiflow.service.HorseService;
import com.equiflow.security.AuthUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Phân quyền theo vai trò được khai báo trong SecurityConfig;
 * quyền sở hữu (khách hàng chỉ sửa ngựa của mình) được kiểm tra trong HorseService.
 */
@RestController
@RequestMapping("/api/horses")
public class HorseController {

    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

    @PostMapping
    public ResponseEntity<HorseResponse> create(@Valid @RequestBody HorseRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(horseService.create(req, userId(auth), isCustomer(auth)));
    }

    @GetMapping
    public List<HorseResponse> getAll(Authentication auth) {
        return horseService.findAll(userId(auth), isCustomer(auth), AuthUtil.isDriverEscort(auth));
    }

    @GetMapping("/my-horses")
    public List<HorseResponse> myHorses(Authentication auth) {
        return horseService.findMine(userId(auth));
    }

    @GetMapping("/{id}")
    public HorseResponse getById(@PathVariable UUID id, Authentication auth) {
        return horseService.findById(id, userId(auth), isCustomer(auth), AuthUtil.isDriverEscort(auth));
    }

    @PutMapping("/{id}")
    public HorseResponse update(@PathVariable UUID id, @Valid @RequestBody HorseRequest req, Authentication auth) {
        return horseService.update(id, req, userId(auth), isCustomer(auth));
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return horseService.delete(id);
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
