package com.equiflow.service;

import com.equiflow.dto.RoleResponse;
import com.equiflow.entity.Role;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.RoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public List<RoleResponse> findAll() {
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(Role::getRoleId))
                .map(RoleService::toResponse)
                .toList();
    }

    public RoleResponse findById(String id) {
        return roleRepository.findById(id.trim())
                .map(RoleService::toResponse)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy vai trò"));
    }

    private static RoleResponse toResponse(Role r) {
        return new RoleResponse(r.getRoleId(), r.getRoleName(), r.getDescription());
    }
}
