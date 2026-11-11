package com.equiflow.service;

import com.equiflow.entity.TransportPlan;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.InspectionRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransportPlanHorseIdsTest {

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private TransportAssignmentRepository assignmentRepository;

    @Mock
    private InspectionRepository inspectionRepository;

    @Mock
    private HorseRepository horseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RequestAccessService requestAccess;

    @Mock
    private CrewAssignmentAccessService crewAccess;

    @Test
    void includesHorseIdsFromTheExistingTransportRequestRelationship() {
        UUID requestId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        TransportPlan plan = new TransportPlan();
        plan.setPlanId(UUID.randomUUID());
        plan.setRequestId(requestId);
        plan.setDepartureTime(LocalDateTime.now());
        plan.setArrivalTime(LocalDateTime.now().plusHours(1));
        plan.setStatus(TransportPlanService.READY);
        when(planRepository.findAllByOrderByDepartureTimeDesc()).thenReturn(List.of(plan));
        when(userRepository.findAllById(Set.of())).thenReturn(List.of());
        when(horseRepository.findAllById(Set.of(horseId))).thenReturn(List.of());
        when(requestAccess.horseIdsByRequest(Set.of(requestId))).thenReturn(Map.of(requestId, List.of(horseId)));

        TransportPlanService service = new TransportPlanService(planRepository, assignmentRepository,
                inspectionRepository, horseRepository, userRepository, requestAccess, crewAccess);

        assertEquals(List.of(horseId), service.findAll(UUID.randomUUID(), false, false, null).get(0).horseIds());
    }
}
