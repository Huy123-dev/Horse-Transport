package com.equiflow.controller;

import com.equiflow.dto.JourneyTimelineDto;
import com.equiflow.service.JourneyTimelineService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import static com.equiflow.security.AuthUtil.isCustomer;
import static com.equiflow.security.AuthUtil.userId;

@RestController
@RequestMapping("/api/transport-plans")
public class JourneyTimelineController {

    private final JourneyTimelineService service;

    public JourneyTimelineController(JourneyTimelineService service) {
        this.service = service;
    }

    @GetMapping("/{id}/timeline")
    public List<JourneyTimelineDto.Response> getTimeline(@PathVariable UUID id, Authentication auth) {
        return service.getTimeline(id, userId(auth), isCustomer(auth));
    }
}
