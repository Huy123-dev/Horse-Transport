package com.equiflow.service;

import com.equiflow.dto.HealthLogDto;
import com.equiflow.dto.IncidentDto;
import com.equiflow.dto.JourneyTimelineDto;
import com.equiflow.dto.TrackingDto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JourneyTimelineServiceTest {

    @Test
    void combinesEventsAndSortsNewestFirst() {
        TrackingService trackingService = mock(TrackingService.class);
        HealthLogService healthLogService = mock(HealthLogService.class);
        IncidentService incidentService = mock(IncidentService.class);
        JourneyTimelineService service = new JourneyTimelineService(
                trackingService, healthLogService, incidentService);

        UUID planId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        LocalDateTime base = LocalDateTime.of(2026, 10, 25, 9, 0);
        when(trackingService.findByPlan(planId, userId, true, false)).thenReturn(List.of(
                new TrackingDto.Response(UUID.randomUUID(), planId, "Checkpoint",
                        BigDecimal.ONE, BigDecimal.ONE, base.plusMinutes(1), userId, "Driver")));
        when(healthLogService.findByPlan(planId, userId, true, false)).thenReturn(List.of(
                new HealthLogDto.Response(UUID.randomUUID(), planId, UUID.randomUUID(), "Horse",
                        3, 40, new BigDecimal("37.50"), "Normal", "Stable", null,
                        base.plusMinutes(3), userId, "Escort")));
        when(incidentService.findByPlan(planId, userId, true, false)).thenReturn(List.of(
                new IncidentDto.Response(UUID.randomUUID(), planId, "Weather", "Heavy rain",
                        false, null, null, "Dang xu ly", null, false, null, null,
                        base.plusMinutes(2))));

        List<JourneyTimelineDto.Response> result = service.getTimeline(planId, userId, true);

        assertEquals(List.of("HEALTH", "INCIDENT", "TRACKING"),
                result.stream().map(JourneyTimelineDto.Response::type).toList());
        assertEquals(List.of(base.plusMinutes(3), base.plusMinutes(2), base.plusMinutes(1)),
                result.stream().map(JourneyTimelineDto.Response::timestamp).toList());
    }
}
