package com.equiflow.service;

import com.equiflow.dto.HealthLogDto;
import com.equiflow.dto.IncidentDto;
import com.equiflow.dto.JourneyTimelineDto;
import com.equiflow.dto.TrackingDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class JourneyTimelineService {

    private final TrackingService trackingService;
    private final HealthLogService healthLogService;
    private final IncidentService incidentService;

    public JourneyTimelineService(TrackingService trackingService,
                                  HealthLogService healthLogService,
                                  IncidentService incidentService) {
        this.trackingService = trackingService;
        this.healthLogService = healthLogService;
        this.incidentService = incidentService;
    }

    @Transactional(readOnly = true)
    public List<JourneyTimelineDto.Response> getTimeline(UUID planId, UUID currentUserId, boolean customer) {
        List<TrackingDto.Response> tracking = trackingService.findByPlan(planId, currentUserId, customer, false);
        List<HealthLogDto.Response> healthLogs = healthLogService.findByPlan(planId, currentUserId, customer, false);
        List<IncidentDto.Response> incidents = incidentService.findByPlan(planId, currentUserId, customer, false);

        List<JourneyTimelineDto.Response> entries = new ArrayList<>();
        tracking.stream().map(this::toTimelineEntry).forEach(entries::add);
        healthLogs.stream().map(this::toTimelineEntry).forEach(entries::add);
        incidents.stream().map(this::toTimelineEntry).forEach(entries::add);

        return entries.stream()
                .sorted(Comparator.comparing(JourneyTimelineDto.Response::timestamp).reversed()
                        .thenComparing(JourneyTimelineDto.Response::type)
                        .thenComparing(JourneyTimelineDto.Response::eventId))
                .toList();
    }

    private JourneyTimelineDto.Response toTimelineEntry(TrackingDto.Response entry) {
        String description = Stream.of(
                        entry.latitude() == null ? null : "Vĩ độ " + entry.latitude(),
                        entry.longitude() == null ? null : "Kinh độ " + entry.longitude())
                .filter(value -> value != null)
                .collect(Collectors.joining(" · "));
        return new JourneyTimelineDto.Response(
                entry.logId(), "TRACKING", entry.reportedAt(),
                entry.milestone() == null ? "Cập nhật vị trí" : entry.milestone(),
                description, entry.latitude(), entry.longitude(), null, null, null, null);
    }

    private JourneyTimelineDto.Response toTimelineEntry(HealthLogDto.Response entry) {
        String description = Stream.of(
                        entry.stressLevel() == null ? null : "Căng thẳng " + entry.stressLevel() + "/10",
                        entry.heartRate() == null ? null : "Nhịp tim " + entry.heartRate() + " lần/phút",
                        entry.temperature() == null ? null : "Nhiệt độ " + entry.temperature() + " °C",
                        entry.appetiteStatus() == null ? null : "Ăn uống: " + entry.appetiteStatus(),
                        entry.notes())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(" · "));
        return new JourneyTimelineDto.Response(
                entry.logId(), "HEALTH", entry.loggedAt(), "Cập nhật sức khỏe",
                description, null, null, entry.horseId(), entry.horseName(), null, null);
    }

    private JourneyTimelineDto.Response toTimelineEntry(IncidentDto.Response entry) {
        String description = entry.category() + ": " + entry.description();
        return new JourneyTimelineDto.Response(
                entry.incidentId(), "INCIDENT", entry.reportedAt(),
                entry.sos() ? "Sự cố khẩn cấp (SOS)" : "Báo cáo sự cố",
                description, entry.latitude(), entry.longitude(), null, null, entry.status(), entry.sos());
    }
}
