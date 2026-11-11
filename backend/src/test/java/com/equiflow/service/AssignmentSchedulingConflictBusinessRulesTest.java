package com.equiflow.service;

import com.equiflow.dto.AssignmentDto;
import com.equiflow.entity.TransportAsset;
import com.equiflow.entity.TransportAssignment;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.TransportAssetRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssignmentSchedulingConflictBusinessRulesTest {

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
    private RequestAccessService access;

    @InjectMocks
    private AssignmentService assignmentService;

    private UUID planId1;
    private UUID planId2;
    private UUID driverId;
    private UUID escortId;
    private UUID assetId;

    private TransportPlan plan1;
    private User driver;
    private User escort;
    private TransportAsset asset;

    @BeforeEach
    void setUp() {
        planId1 = UUID.randomUUID();
        planId2 = UUID.randomUUID();
        driverId = UUID.randomUUID();
        escortId = UUID.randomUUID();
        assetId = UUID.randomUUID();

        // Kế hoạch 1: 10/11 08:00 đến 10/11 16:00
        plan1 = new TransportPlan();
        plan1.setPlanId(planId1);
        plan1.setDepartureTime(LocalDateTime.of(2026, 11, 10, 8, 0));
        plan1.setArrivalTime(LocalDateTime.of(2026, 11, 10, 16, 0));
        plan1.setStatus(TransportPlanService.PLANNING);

        driver = new User();
        driver.setUserId(driverId);
        driver.setName("Nguyễn Văn Tài Xế");
        driver.setRoleId("DRIVER");
        driver.setActive(true);

        escort = new User();
        escort.setUserId(escortId);
        escort.setName("Lê Thị Hộ Tống");
        escort.setRoleId("ESCORT");
        escort.setActive(true);

        asset = new TransportAsset();
        asset.setAssetId(assetId);
        asset.setName("Xe Chuyên Dụng EQ-01");
        asset.setType("TRUCK");
        asset.setStatus(TransportAssetService.AVAILABLE);
    }

    @Test
    @DisplayName("Scenario 1: Driver đang bận không thể phân công vào chuyến trùng giờ (trả về 409)")
    void test1_driverBusyInOverlappingTripCannotBeAssigned() {
        when(planRepository.findByIdForUpdate(planId1)).thenReturn(Optional.of(plan1));
        when(userRepository.findById(driverId)).thenReturn(Optional.of(driver));

        TransportAssignment conflictingAssignment = new TransportAssignment();
        conflictingAssignment.setPlanId(planId2);
        conflictingAssignment.setDriverUserId(driverId);

        TransportPlan conflictingPlan = new TransportPlan();
        conflictingPlan.setPlanId(planId2);
        conflictingPlan.setDepartureTime(LocalDateTime.of(2026, 11, 10, 12, 0));
        conflictingPlan.setArrivalTime(LocalDateTime.of(2026, 11, 10, 18, 0));
        conflictingPlan.setStatus(TransportPlanService.IN_PROGRESS);

        when(assignmentRepository.findUserConflicts(eq(driverId), eq(planId1), eq(NO_ASSIGNMENT),
                eq(TransportPlanService.OPEN), eq(plan1.getDepartureTime()), eq(plan1.getArrivalTime())))
                .thenReturn(List.of(conflictingAssignment));
        when(planRepository.findById(planId2)).thenReturn(Optional.of(conflictingPlan));

        AssignmentDto.Request req = new AssignmentDto.Request(null, driverId, null);
        ApiException ex = assertThrows(ApiException.class, () -> assignmentService.create(planId1, req));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Nguyễn Văn Tài Xế"));
        assertTrue(ex.getMessage().contains("đã được phân công"));
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scenario 2: Escort đang bận không thể phân công vào chuyến trùng giờ (trả về 409)")
    void test2_escortBusyInOverlappingTripCannotBeAssigned() {
        when(planRepository.findByIdForUpdate(planId1)).thenReturn(Optional.of(plan1));
        when(userRepository.findById(escortId)).thenReturn(Optional.of(escort));

        TransportAssignment conflictingAssignment = new TransportAssignment();
        conflictingAssignment.setPlanId(planId2);
        conflictingAssignment.setAttendantUserId(escortId);

        when(assignmentRepository.findUserConflicts(eq(escortId), eq(planId1), eq(NO_ASSIGNMENT),
                eq(TransportPlanService.OPEN), eq(plan1.getDepartureTime()), eq(plan1.getArrivalTime())))
                .thenReturn(List.of(conflictingAssignment));

        AssignmentDto.Request req = new AssignmentDto.Request(null, null, escortId);
        ApiException ex = assertThrows(ApiException.class, () -> assignmentService.create(planId1, req));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Lê Thị Hộ Tống"));
        assertTrue(ex.getMessage().contains("đã được phân công"));
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scenario 3: Phương tiện đang vận chuyển không thể sử dụng cho chuyến trùng giờ (trả về 409)")
    void test3_vehicleBusyInOverlappingTripCannotBeAssigned() {
        when(planRepository.findByIdForUpdate(planId1)).thenReturn(Optional.of(plan1));
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));

        TransportAssignment conflictingAssignment = new TransportAssignment();
        conflictingAssignment.setPlanId(planId2);
        conflictingAssignment.setAssetId(assetId);

        when(assignmentRepository.findAssetConflicts(eq(assetId), eq(planId1), eq(NO_ASSIGNMENT),
                eq(TransportPlanService.OPEN), eq(plan1.getDepartureTime()), eq(plan1.getArrivalTime())))
                .thenReturn(List.of(conflictingAssignment));

        AssignmentDto.Request req = new AssignmentDto.Request(assetId, null, null);
        ApiException ex = assertThrows(ApiException.class, () -> assignmentService.create(planId1, req));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Xe Chuyên Dụng EQ-01"));
        assertTrue(ex.getMessage().contains("đang được sử dụng"));
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Scenario 4: Phương tiện, Driver và Escort đều khả dụng -> phân công thành công")
    void test4_allAvailable_assignmentSuccess() {
        when(planRepository.findByIdForUpdate(planId1)).thenReturn(Optional.of(plan1));
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(userRepository.findById(driverId)).thenReturn(Optional.of(driver));
        when(userRepository.findById(escortId)).thenReturn(Optional.of(escort));

        when(assignmentRepository.findAssetConflicts(eq(assetId), eq(planId1), eq(NO_ASSIGNMENT),
                eq(TransportPlanService.OPEN), eq(plan1.getDepartureTime()), eq(plan1.getArrivalTime())))
                .thenReturn(List.of());
        when(assignmentRepository.findUserConflicts(eq(driverId), eq(planId1), eq(NO_ASSIGNMENT),
                eq(TransportPlanService.OPEN), eq(plan1.getDepartureTime()), eq(plan1.getArrivalTime())))
                .thenReturn(List.of());
        when(assignmentRepository.findUserConflicts(eq(escortId), eq(planId1), eq(NO_ASSIGNMENT),
                eq(TransportPlanService.OPEN), eq(plan1.getDepartureTime()), eq(plan1.getArrivalTime())))
                .thenReturn(List.of());

        when(assetRepository.findAllById(any())).thenReturn(List.of(asset));
        when(userRepository.findAllById(any())).thenReturn(List.of(driver, escort));

        when(assignmentRepository.saveAndFlush(any(TransportAssignment.class))).thenAnswer(i -> {
            TransportAssignment a = i.getArgument(0);
            a.setAssignmentId(UUID.randomUUID());
            return a;
        });

        AssignmentDto.Request req = new AssignmentDto.Request(assetId, driverId, escortId);
        AssignmentDto.Response res = assignmentService.create(planId1, req);

        assertNotNull(res);
        assertEquals(planId1, res.planId());
        assertEquals("Xe Chuyên Dụng EQ-01", res.assetName());
        assertEquals("Nguyễn Văn Tài Xế", res.driverName());
        assertEquals("Lê Thị Hộ Tống", res.attendantName());
        verify(assignmentRepository).saveAndFlush(any(TransportAssignment.class));
    }

    @Test
    @DisplayName("Scenario 9 & 14: Sửa phân công loại trừ chính bản thân khỏi trùng lịch; từ chối khi phương tiện bảo trì")
    void test9_and_14_editExcludesSelfAndMaintenanceCheck() {
        UUID assignmentId = UUID.randomUUID();
        TransportAssignment existingAssignment = new TransportAssignment();
        existingAssignment.setAssignmentId(assignmentId);
        existingAssignment.setPlanId(planId1);
        existingAssignment.setAssetId(assetId);

        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(existingAssignment));
        when(planRepository.findByIdForUpdate(planId1)).thenReturn(Optional.of(plan1));

        // Kiểm tra phương tiện bảo trì
        TransportAsset maintenanceAsset = new TransportAsset();
        maintenanceAsset.setAssetId(UUID.randomUUID());
        maintenanceAsset.setName("Xe Hỏng EQ-99");
        maintenanceAsset.setStatus(TransportAssetService.MAINTENANCE);
        when(assetRepository.findById(maintenanceAsset.getAssetId())).thenReturn(Optional.of(maintenanceAsset));

        AssignmentDto.Request reqMaint = new AssignmentDto.Request(maintenanceAsset.getAssetId(), null, null);
        ApiException exMaint = assertThrows(ApiException.class, () ->
                assignmentService.update(assignmentId, reqMaint));
        assertEquals(HttpStatus.CONFLICT, exMaint.getStatus());
        assertTrue(exMaint.getMessage().contains("đang trong thời gian bảo trì"));
    }

    @Test
    @DisplayName("Validation thời gian: Thời gian kết thúc phải lớn hơn thời gian bắt đầu")
    void test_timeValidation_endMustBeAfterStart() {
        TransportPlan invalidPlan = new TransportPlan();
        invalidPlan.setPlanId(planId1);
        invalidPlan.setDepartureTime(LocalDateTime.of(2026, 11, 10, 16, 0));
        invalidPlan.setArrivalTime(LocalDateTime.of(2026, 11, 10, 10, 0)); // Đến trước khi đi
        invalidPlan.setStatus(TransportPlanService.PLANNING);

        when(planRepository.findByIdForUpdate(planId1)).thenReturn(Optional.of(invalidPlan));

        AssignmentDto.Request req = new AssignmentDto.Request(assetId, null, null);
        ApiException ex = assertThrows(ApiException.class, () -> assignmentService.create(planId1, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Thời gian kết thúc phải lớn hơn thời gian bắt đầu"));
    }
}
