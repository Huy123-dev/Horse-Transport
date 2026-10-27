package com.equiflow.controller;

import com.equiflow.dto.NotificationDto;
import com.equiflow.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificationDto.Response> getMine(
            @RequestParam(defaultValue = "false") boolean unreadOnly, Authentication auth) {
        return service.findMine(userId(auth), unreadOnly);
    }

    @GetMapping("/unread-count")
    public NotificationDto.UnreadCount getUnreadCount(Authentication auth) {
        return service.unreadCount(userId(auth));
    }

    @PatchMapping("/{id}/read")
    public NotificationDto.Response markRead(@PathVariable UUID id, Authentication auth) {
        return service.markRead(id, userId(auth));
    }

    @PatchMapping("/read-all")
    public NotificationDto.UnreadCount markAllRead(Authentication auth) {
        return service.markAllRead(userId(auth));
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }
}
