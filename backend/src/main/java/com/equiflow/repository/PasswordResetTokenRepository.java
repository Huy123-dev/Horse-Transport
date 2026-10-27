package com.equiflow.repository;

import com.equiflow.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    boolean existsByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime createdAt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    void deleteByUserId(UUID userId);

    void deleteByTokenHash(String tokenHash);

    @Modifying
    @Query("delete from PasswordResetToken t where t.expiresAt < :now")
    int deleteExpiredBefore(@Param("now") LocalDateTime now);

    @Modifying
    @Query("""
            delete from PasswordResetToken t
            where t.userId = :userId and t.resetTokenId <> :currentTokenId
            """)
    int deleteOtherTokens(@Param("userId") UUID userId, @Param("currentTokenId") UUID currentTokenId);
}
