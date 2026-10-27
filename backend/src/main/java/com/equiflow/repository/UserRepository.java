package com.equiflow.repository;

import com.equiflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByEmailAndUserIdNot(String email, UUID userId);
    boolean existsByPhoneNumberAndUserIdNot(String phoneNumber, UUID userId);
    boolean existsByUserIdAndActiveTrue(UUID userId);
    long countByRoleIdAndActiveTrue(String roleId);
    List<User> findAllByOrderByCreatedAtDesc();
    List<User> findByRoleId(String roleId);
    List<User> findByRoleIdAndActiveTrue(String roleId);
    List<User> findByRoleIdInAndActiveTrue(List<String> roleIds);
}
