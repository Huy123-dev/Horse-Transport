package com.equiflow.repository;

import com.equiflow.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop100ByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId);
    List<Notification> findTop100ByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(UUID recipientUserId);
    long countByRecipientUserIdAndReadFalse(UUID recipientUserId);
    Optional<Notification> findByNotificationIdAndRecipientUserId(UUID notificationId, UUID recipientUserId);
    @Modifying
    @Query("""
            update Notification n set n.read = true, n.readAt = CURRENT_TIMESTAMP
            where n.recipientUserId = :recipientUserId and n.read = false
            """)
    int markAllReadByRecipientUserId(@Param("recipientUserId") UUID recipientUserId);
}
