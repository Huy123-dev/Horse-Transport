package com.equiflow.service;

import com.equiflow.entity.Delivery;
import com.equiflow.entity.TransportPlan;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.IncidentRepository;
import com.equiflow.repository.TrackingLogRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverActivityReadScopeTest {

    @Mock
    private TrackingLogRepository trackingRepository;

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RequestAccessService requestAccess;

    @Mock
    private CrewAssignmentAccessService crewAccess;

    @Mock
    private DeliveryRepository deliveryRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private TransportPlanService planService;

    @Test
    void trackingReadsRequireAnAssignmentBeforeQueryingLogs() {
        UUID planId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(planRepository.findById(planId)).thenReturn(Optional.of(new TransportPlan()));
        doThrow(new ApiException(HttpStatus.NOT_FOUND, "not assigned"))
                .when(crewAccess).assertAssigned(planId, userId);
        TrackingService service = new TrackingService(trackingRepository, planRepository, userRepository,
                requestAccess, crewAccess);

        ApiException historyError = assertThrows(ApiException.class,
                () -> service.findByPlan(planId, userId, false, true));
        ApiException latestError = assertThrows(ApiException.class,
                () -> service.findLatest(planId, userId, false, true));

        assertEquals(HttpStatus.NOT_FOUND, historyError.getStatus());
        assertEquals(HttpStatus.NOT_FOUND, latestError.getStatus());
        verify(crewAccess, org.mockito.Mockito.times(2)).assertAssigned(planId, userId);
        verifyNoInteractions(trackingRepository);
    }

    @Test
    void deliveryReadsRequireAnAssignmentBeforeReturningDeliveryData() {
        UUID planId = UUID.randomUUID();
        UUID deliveryId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Delivery delivery = org.mockito.Mockito.mock(Delivery.class);
        when(delivery.getPlanId()).thenReturn(planId);
        when(deliveryRepository.findById(deliveryId)).thenReturn(Optional.of(delivery));
        TransportPlan plan = org.mockito.Mockito.mock(TransportPlan.class);
        when(plan.getPlanId()).thenReturn(planId);
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        doThrow(new ApiException(HttpStatus.NOT_FOUND, "not assigned"))
                .when(crewAccess).assertAssigned(planId, userId);
        DeliveryService service = new DeliveryService(deliveryRepository, planRepository, incidentRepository,
                userRepository, planService, requestAccess, crewAccess);

        ApiException byIdError = assertThrows(ApiException.class,
                () -> service.findById(deliveryId, userId, false, true));
        ApiException byPlanError = assertThrows(ApiException.class,
                () -> service.findByPlan(planId, userId, false, true));

        assertEquals(HttpStatus.NOT_FOUND, byIdError.getStatus());
        assertEquals(HttpStatus.NOT_FOUND, byPlanError.getStatus());
        verify(crewAccess, org.mockito.Mockito.times(2)).assertAssigned(planId, userId);
        verify(deliveryRepository).findById(deliveryId);
        verify(deliveryRepository, org.mockito.Mockito.never()).findFirstByPlanIdOrderByDeliveredAtDesc(planId);
    }
}
