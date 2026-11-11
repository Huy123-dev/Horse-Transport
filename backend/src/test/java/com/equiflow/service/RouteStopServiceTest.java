package com.equiflow.service;

import com.equiflow.dto.RouteStopDto;
import com.equiflow.entity.RouteStop;
import com.equiflow.entity.TransportPlan;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.RouteStopRepository;
import com.equiflow.repository.TransportPlanRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RouteStopServiceTest {

    @Mock
    private RouteStopRepository stopRepository;
    @Mock
    private TransportPlanRepository planRepository;
    @Mock
    private LocationRepository locationRepository;
    @Mock
    private RequestAccessService access;
    @Mock
    private CrewAssignmentAccessService crewAccess;

    @InjectMocks
    private RouteStopService routeStopService;

    @Test
    void cannotConfirmStopOutOfOrder() {
        UUID planId = UUID.randomUUID();
        UUID stop1Id = UUID.randomUUID();
        UUID stop2Id = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setStatus(TransportPlanService.IN_PROGRESS);

        RouteStop stop1 = new RouteStop();
        stop1.setStopId(stop1Id);
        stop1.setPlanId(planId);
        stop1.setSequenceNo(1);
        stop1.setStopName("Trạm khởi hành");
        stop1.setStopType("ORIGIN");
        stop1.setActualArrivalTime(null); // Not arrived yet!

        RouteStop stop2 = new RouteStop();
        stop2.setStopId(stop2Id);
        stop2.setPlanId(planId);
        stop2.setSequenceNo(2);
        stop2.setStopName("Trạm kiểm dịch");
        stop2.setStopType("QUARANTINE");

        when(stopRepository.findById(stop2Id)).thenReturn(Optional.of(stop2));
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(stopRepository.findByPlanIdOrderBySequenceNoAsc(planId)).thenReturn(List.of(stop1, stop2));

        OffsetDateTime arrival = OffsetDateTime.of(2026, 11, 10, 10, 52, 0, 0, ZoneOffset.UTC);
        ApiException ex = assertThrows(ApiException.class, () ->
                routeStopService.updateStatus(stop2Id,
                        new RouteStopDto.StatusRequest(arrival, null, "Đã tới mốc 2"),
                        driverId, true));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("Không thể xác nhận vượt mốc. Bạn cần xác nhận mốc trước đó (Mốc 1: Trạm khởi hành)", ex.getMessage());
    }

    @Test
    void canConfirmStopInOrder() {
        UUID planId = UUID.randomUUID();
        UUID stop1Id = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setStatus(TransportPlanService.READY);

        RouteStop stop1 = new RouteStop();
        stop1.setStopId(stop1Id);
        stop1.setPlanId(planId);
        stop1.setSequenceNo(1);
        stop1.setStopName("Trạm khởi hành");
        stop1.setStopType("ORIGIN");

        when(stopRepository.findById(stop1Id)).thenReturn(Optional.of(stop1));
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(stopRepository.findByPlanIdOrderBySequenceNoAsc(planId)).thenReturn(List.of(stop1));
        when(stopRepository.save(any(RouteStop.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OffsetDateTime arrival = OffsetDateTime.of(2026, 11, 10, 10, 52, 0, 0, ZoneOffset.UTC);
        RouteStopDto.Response res = routeStopService.updateStatus(stop1Id,
                new RouteStopDto.StatusRequest(arrival, null, "Bắt đầu hành trình"),
                driverId, true);

        assertNotNull(res);
        assertEquals(arrival, res.actualArrivalTime());
        assertEquals(LocalDateTime.of(2026, 11, 10, 10, 52), stop1.getActualArrivalTime());
        assertEquals(TransportPlanService.IN_PROGRESS, plan.getStatus());
    }

    @Test
    void confirmingDeparturePreservesPreviouslyRecordedArrival() {
        UUID planId = UUID.randomUUID();
        UUID stopId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();
        LocalDateTime recordedArrival = LocalDateTime.of(2026, 11, 10, 10, 52);

        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setStatus(TransportPlanService.IN_PROGRESS);

        RouteStop stop = new RouteStop();
        stop.setStopId(stopId);
        stop.setPlanId(planId);
        stop.setSequenceNo(1);
        stop.setStopName("Trạm dừng");
        stop.setStopType("REST");
        stop.setActualArrivalTime(recordedArrival);

        when(stopRepository.findById(stopId)).thenReturn(Optional.of(stop));
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(stopRepository.findByPlanIdOrderBySequenceNoAsc(planId)).thenReturn(List.of(stop));
        when(stopRepository.save(any(RouteStop.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OffsetDateTime departure = OffsetDateTime.of(2026, 11, 10, 11, 41, 0, 0, ZoneOffset.UTC);
        RouteStopDto.Response response = routeStopService.updateStatus(stopId,
                new RouteStopDto.StatusRequest(null, departure, null), driverId, true);

        assertEquals(recordedArrival, stop.getActualArrivalTime());
        assertEquals(OffsetDateTime.of(recordedArrival, ZoneOffset.UTC), response.actualArrivalTime());
        assertEquals(departure, response.actualDepartureTime());
    }

    @Test
    void cannotConfirmDepartureBeforeArrivalWasRecorded() {
        UUID planId = UUID.randomUUID();
        UUID stopId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setStatus(TransportPlanService.IN_PROGRESS);

        RouteStop stop = new RouteStop();
        stop.setStopId(stopId);
        stop.setPlanId(planId);
        stop.setSequenceNo(1);
        stop.setStopName("Trạm dừng");
        stop.setStopType("REST");

        when(stopRepository.findById(stopId)).thenReturn(Optional.of(stop));
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(stopRepository.findByPlanIdOrderBySequenceNoAsc(planId)).thenReturn(List.of(stop));

        ApiException ex = assertThrows(ApiException.class, () -> routeStopService.updateStatus(stopId,
                new RouteStopDto.StatusRequest(null,
                        OffsetDateTime.of(2026, 11, 10, 11, 41, 0, 0, ZoneOffset.UTC), null),
                driverId, true));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("Không thể xác nhận rời mốc khi chưa ghi nhận giờ đến", ex.getMessage());
    }
}
