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

        ApiException ex = assertThrows(ApiException.class, () ->
                routeStopService.updateStatus(stop2Id,
                        new RouteStopDto.StatusRequest(LocalDateTime.now(), null, "Đã tới mốc 2"),
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

        RouteStopDto.Response res = routeStopService.updateStatus(stop1Id,
                new RouteStopDto.StatusRequest(LocalDateTime.now(), null, "Bắt đầu hành trình"),
                driverId, true);

        assertNotNull(res);
        assertNotNull(res.actualArrivalTime());
        assertEquals(TransportPlanService.IN_PROGRESS, plan.getStatus());
    }
}
