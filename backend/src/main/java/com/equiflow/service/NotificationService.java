package com.equiflow.service;

import com.equiflow.dto.NotificationDto;
import com.equiflow.entity.Notification;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto.Response> findMine(UUID userId, boolean unreadOnly) {
        List<Notification> notifications = unreadOnly
                ? repository.findTop100ByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                : repository.findTop100ByRecipientUserIdOrderByCreatedAtDesc(userId);
        return notifications.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public NotificationDto.UnreadCount unreadCount(UUID userId) {
        return new NotificationDto.UnreadCount(repository.countByRecipientUserIdAndReadFalse(userId));
    }

    @Transactional
    public NotificationDto.Response markRead(UUID notificationId, UUID userId) {
        Notification notification = repository.findByNotificationIdAndRecipientUserId(notificationId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo"));
        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now(ZoneOffset.UTC));
            notification = repository.save(notification);
        }
        return toResponse(notification);
    }

    @Transactional
    public NotificationDto.UnreadCount markAllRead(UUID userId) {
        repository.markAllReadByRecipientUserId(userId);
        return new NotificationDto.UnreadCount(0);
    }

    private NotificationDto.Response toResponse(Notification notification) {
        return new NotificationDto.Response(
                notification.getNotificationId(), notification.getType(), notification.getTitle(),
                notification.getMessage(), notification.getRelatedEntityType(),
                notification.getRelatedEntityId(), notification.isRead(),
                notification.getCreatedAt(), notification.getReadAt());
    }
}
