package com.equiflow.service;

import com.equiflow.dto.AssignmentDto;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.TransportAssetRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {

    private static final UUID NO_ASSIGNMENT = new UUID(0L, 0L);

    @Mock
    private TransportAssignmentRepository assignmentRepository;

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private TransportAssetRepository assetRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RequestAccessService requestAccessService;

    @InjectMocks
    private AssignmentService assignmentService;

    @Test
    void rejectsAFifthDistinctEscortForAPlan() {
        UUID planId = UUID.randomUUID();
        UUID attendantId = UUID.randomUUID();
        LocalDateTime departure = LocalDateTime.now().plusDays(1);
        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setDepartureTime(departure);
        plan.setArrivalTime(departure.plusHours(5));
        plan.setStatus(TransportPlanService.PLANNING);

        User attendant = new User();
        attendant.setUserId(attendantId);
        attendant.setRoleId("DRIVER_ESCORT");
        attendant.setName("Test Escort");

        when(planRepository.findByIdForUpdate(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(attendantId)).thenReturn(Optional.of(attendant));
        when(assignmentRepository.countUserConflicts(
                attendantId, planId, TransportPlanService.OPEN, plan.getDepartureTime(), plan.getArrivalTime()))
                .thenReturn(0L);
        when(assignmentRepository.countDistinctAttendantsByPlanIdAndAssignmentIdNot(planId, NO_ASSIGNMENT))
                .thenReturn(4L);
        when(assignmentRepository.existsByPlanIdAndAssignmentIdNotAndAttendantUserId(
                planId, NO_ASSIGNMENT, attendantId)).thenReturn(false);

        ApiException error = assertThrows(ApiException.class, () -> assignmentService.create(
                planId, new AssignmentDto.Request(null, null, attendantId)));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsDriverAccountInAttendantAssignment() {
        UUID planId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();
        LocalDateTime departure = LocalDateTime.now().plusDays(1);
        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setDepartureTime(departure);
        plan.setArrivalTime(departure.plusHours(5));
        plan.setStatus(TransportPlanService.PLANNING);

        User driver = new User();
        driver.setUserId(driverId);
        driver.setRoleId("DRIVER");
        driver.setActive(true);

        when(planRepository.findByIdForUpdate(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(driverId)).thenReturn(Optional.of(driver));

        ApiException error = assertThrows(ApiException.class, () -> assignmentService.create(
                planId, new AssignmentDto.Request(null, null, driverId)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsEscortAccountInDriverAssignment() {
        UUID planId = UUID.randomUUID();
        UUID escortId = UUID.randomUUID();
        LocalDateTime departure = LocalDateTime.now().plusDays(1);
        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setDepartureTime(departure);
        plan.setArrivalTime(departure.plusHours(5));
        plan.setStatus(TransportPlanService.PLANNING);

        User escort = new User();
        escort.setUserId(escortId);
        escort.setRoleId("ESCORT");
        escort.setActive(true);

        when(planRepository.findByIdForUpdate(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(escortId)).thenReturn(Optional.of(escort));

        ApiException error = assertThrows(ApiException.class, () -> assignmentService.create(
                planId, new AssignmentDto.Request(null, escortId, null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void assignmentOptionsSeparateDriversAndAttendantsWhileKeepingLegacyCrewCompatible() {
        UUID planId = UUID.randomUUID();
        User driver = crewUser("DRIVER", "Driver");
        User escort = crewUser("ESCORT", "Escort");
        User legacy = crewUser("DRIVER_ESCORT", "Legacy");
        when(planRepository.findById(planId)).thenReturn(Optional.of(new TransportPlan()));
        when(assetRepository.findAllByOrderByNameAsc()).thenReturn(List.of());
        when(userRepository.findByRoleIdInAndActiveTrue(anyList())).thenReturn(List.of(driver, escort, legacy));

        AssignmentDto.OptionsResponse options = assignmentService.options(planId);

        assertEquals(List.of(driver.getUserId(), legacy.getUserId()),
                options.drivers().stream().map(AssignmentDto.Option::id).toList());
        assertEquals(List.of(escort.getUserId(), legacy.getUserId()),
                options.attendants().stream().map(AssignmentDto.Option::id).toList());
        assertEquals(3, options.crew().size());
    }

    private static User crewUser(String roleId, String name) {
        User user = new User();
        user.setUserId(UUID.randomUUID());
        user.setRoleId(roleId);
        user.setName(name);
        return user;
    }
}
