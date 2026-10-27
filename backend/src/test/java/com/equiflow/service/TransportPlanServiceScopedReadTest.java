package com.equiflow.service;

import com.equiflow.entity.TransportPlan;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.InspectionRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransportPlanServiceScopedReadTest {

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
    private RequestAccessService requestAccessService;

    @Mock
    private CrewAssignmentAccessService crewAccess;

    @InjectMocks
    private TransportPlanService planService;

    @Test
    void driverPlanListQueriesOnlyPlanIdsFromTheirAssignments() {
        UUID userId = UUID.randomUUID();
        List<UUID> assignedPlanIds = List.of(UUID.randomUUID());
        when(crewAccess.assignedPlanIds(userId)).thenReturn(assignedPlanIds);
        when(planRepository.findByPlanIdInOrderByDepartureTimeDesc(assignedPlanIds)).thenReturn(List.of());
        when(userRepository.findAllById(anyCollection())).thenReturn(List.of());

        planService.findAll(userId, false, true, null);

        verify(planRepository).findByPlanIdInOrderByDepartureTimeDesc(assignedPlanIds);
        verify(planRepository, never()).findAllByOrderByDepartureTimeDesc();
    }

    @Test
    void driverCannotReadAPlanOutsideTheirAssignments() {
        UUID userId = UUID.randomUUID();
        UUID planId = UUID.randomUUID();
        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        doThrow(new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"))
                .when(crewAccess).assertAssigned(planId, userId);

        assertThrows(ApiException.class, () -> planService.findById(planId, userId, false, true));

        verify(userRepository, never()).findAllById(anyCollection());
    }
}
