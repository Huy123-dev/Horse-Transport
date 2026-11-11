package com.equiflow.repository;

import com.equiflow.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.userId = :userId")
    Optional<User> findByIdForUpdate(@Param("userId") UUID userId);

    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
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
