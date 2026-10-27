package com.equiflow.controller;

import com.equiflow.dto.RoleResponse;
import com.equiflow.service.RoleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Chỉ Logistics Manager truy cập (khai báo trong SecurityConfig). */
@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public List<RoleResponse> getAll() {
        return roleService.findAll();
    }

    @GetMapping("/{id}")
    public RoleResponse getById(@PathVariable String id) {
        return roleService.findById(id);
    }
}
