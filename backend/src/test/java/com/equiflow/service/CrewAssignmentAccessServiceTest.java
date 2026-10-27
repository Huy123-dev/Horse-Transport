package com.equiflow.service;

import com.equiflow.exception.ApiException;
import com.equiflow.repository.TransportAssignmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrewAssignmentAccessServiceTest {

    @Mock
    private TransportAssignmentRepository assignmentRepository;

    @InjectMocks
    private CrewAssignmentAccessService accessService;

    @Test
    void returnsOnlyPlanIdsAssignedToTheCurrentCrewMember() {
        UUID userId = UUID.randomUUID();
        List<UUID> planIds = List.of(UUID.randomUUID());
        when(assignmentRepository.findAssignedPlanIds(userId)).thenReturn(planIds);

        assertEquals(planIds, accessService.assignedPlanIds(userId));
    }

    @Test
    void hidesPlansWithoutAnAssignmentFromReadEndpoints() {
        UUID planId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(assignmentRepository.countCrewAssignments(planId, userId)).thenReturn(0L);

        ApiException error = assertThrows(ApiException.class, () -> accessService.assertAssigned(planId, userId));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(assignmentRepository).countCrewAssignments(planId, userId);
    }
}
