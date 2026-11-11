package com.equiflow.service;

import com.equiflow.repository.HealthLogRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.IncidentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssignmentScopedActivityReadTest {

    @Mock
    private HealthLogRepository healthLogRepository;

    @Mock
    private HorseRepository horseRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RequestAccessService requestAccessService;

    @Mock
    private CrewAssignmentAccessService crewAccess;

    @InjectMocks
    private HealthLogService healthLogService;

    @InjectMocks
    private IncidentService incidentService;

    @Test
    void driverHorseHistoryQueriesOnlyTheirAssignedPlans() {
        UUID userId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        List<UUID> assignedPlanIds = List.of(UUID.randomUUID());
        when(crewAccess.assignedPlanIds(userId)).thenReturn(assignedPlanIds);
        when(healthLogRepository.findByHorseIdAndPlanIdInOrderByLoggedAtDesc(horseId, assignedPlanIds))
                .thenReturn(List.of());
        when(horseRepository.findAllById(anyCollection())).thenReturn(List.of());
        when(userRepository.findAllById(anyCollection())).thenReturn(List.of());

        healthLogService.findByHorse(horseId, userId, false, true);

        verify(healthLogRepository).findByHorseIdAndPlanIdInOrderByLoggedAtDesc(horseId, assignedPlanIds);
        verify(healthLogRepository, never()).findByHorseIdOrderByLoggedAtDesc(horseId);
        verify(horseRepository, never()).findById(horseId);
    }

    @Test
    void driverIncidentListQueriesOnlyTheirAssignedPlans() {
        UUID userId = UUID.randomUUID();
        UUID assignedPlanId = UUID.randomUUID();
        when(crewAccess.assignedPlanIds(userId)).thenReturn(List.of(assignedPlanId));
        when(incidentRepository.findByPlanIdInOrderByReportedAtDesc(Set.of(assignedPlanId))).thenReturn(List.of());
        when(userRepository.findAllById(anyCollection())).thenReturn(List.of());

        incidentService.findAll(userId, false, true, null, null);

        verify(incidentRepository).findByPlanIdInOrderByReportedAtDesc(Set.of(assignedPlanId));
        verify(incidentRepository, never()).findAllByOrderByReportedAtDesc();
    }
}
