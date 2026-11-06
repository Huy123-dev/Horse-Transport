package com.equiflow.service;

import com.equiflow.dto.DeliveryDto;
import com.equiflow.dto.TransportPlanDto;
import com.equiflow.entity.Delivery;
import com.equiflow.entity.Incident;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.IncidentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceTest {

    @Mock
    private DeliveryRepository deliveryRepository;

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransportPlanService planService;

    @Mock
    private RequestAccessService access;

    @Mock
    private CrewAssignmentAccessService crewAccess;

    @InjectMocks
    private DeliveryService deliveryService;

    private UUID planId;
    private UUID requestId;
    private UUID reporterId;
    private UUID customerId;
    private TransportPlan plan;

    @BeforeEach
    void setUp() {
        planId = UUID.randomUUID();
        requestId = UUID.randomUUID();
        reporterId = UUID.randomUUID();
        customerId = UUID.randomUUID();

        plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setRequestId(requestId);
        plan.setStatus(TransportPlanService.IN_PROGRESS);
    }

    @Test
    void create_success_whenAssignedAndInProgress() {
        DeliveryDto.CreateRequest req = new DeliveryDto.CreateRequest(
                planId, "Nguyen Van Nhan", "http://example.com/sig.png",
                "http://example.com/pod.pdf", LocalDateTime.now(ZoneOffset.UTC)
        );

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(crewAccess.isAssigned(planId, reporterId)).thenReturn(true);
        when(deliveryRepository.existsByPlanId(planId)).thenReturn(false);

        Delivery saved = new Delivery();
        saved.setDeliveryId(UUID.randomUUID());
        saved.setPlanId(planId);
        saved.setRecipientName(req.recipientName());
        saved.setSignatureImageUrl(req.signatureImageUrl());
        saved.setPodDocumentUrl(req.podDocumentUrl());
        saved.setDeliveredAt(req.deliveredAt());

        when(deliveryRepository.saveAndFlush(any(Delivery.class))).thenReturn(saved);

        TransportRequest tr = new TransportRequest();
        tr.setRequestId(requestId);
        tr.setCustomerId(customerId);
        when(access.getOrThrow(requestId)).thenReturn(tr);

        DeliveryDto.Response response = deliveryService.create(req, reporterId);

        assertNotNull(response);
        assertEquals(planId, response.planId());
        assertEquals("Nguyen Van Nhan", response.recipientName());
        verify(deliveryRepository).saveAndFlush(any(Delivery.class));
        verify(access).notify(eq(customerId), eq("PLAN_UPDATE"), anyString(), anyString(), eq("transport_plans"), eq(planId));
    }

    @Test
    void create_throwsForbidden_whenNotAssigned() {
        DeliveryDto.CreateRequest req = new DeliveryDto.CreateRequest(
                planId, "Nguyen Van Nhan", "http://example.com/sig.png", null, null
        );

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(crewAccess.isAssigned(planId, reporterId)).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class, () -> deliveryService.create(req, reporterId));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("không được phân công"));
    }

    @Test
    void create_throwsConflict_whenPlanNotInProgress() {
        plan.setStatus(TransportPlanService.READY);
        DeliveryDto.CreateRequest req = new DeliveryDto.CreateRequest(
                planId, "Nguyen Van Nhan", "http://example.com/sig.png", null, null
        );

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(crewAccess.isAssigned(planId, reporterId)).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> deliveryService.create(req, reporterId));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Chỉ ghi nhận bàn giao khi chuyến đang thực hiện"));
    }

    @Test
    void create_throwsConflict_whenAlreadyDelivered() {
        DeliveryDto.CreateRequest req = new DeliveryDto.CreateRequest(
                planId, "Nguyen Van Nhan", "http://example.com/sig.png", null, null
        );

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(crewAccess.isAssigned(planId, reporterId)).thenReturn(true);
        when(deliveryRepository.existsByPlanId(planId)).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> deliveryService.create(req, reporterId));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("đã được ghi nhận bàn giao"));
    }

    @Test
    void complete_success_whenDeliveredAndNoOpenIncidents() {
        User user = new User();
        user.setUserId(reporterId);
        user.setRoleId("DRIVER");

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user));
        when(crewAccess.isAssigned(planId, reporterId)).thenReturn(true);
        when(deliveryRepository.existsByPlanId(planId)).thenReturn(true);
        when(incidentRepository.findByPlanIdOrderByReportedAtDesc(planId)).thenReturn(List.of());

        TransportRequest tr = new TransportRequest();
        tr.setRequestId(requestId);
        tr.setCustomerId(customerId);
        when(access.getOrThrow(requestId)).thenReturn(tr);

        TransportPlanDto.Response planResp = new TransportPlanDto.Response(
                planId, requestId, "Route", LocalDateTime.now(), LocalDateTime.now().plusDays(1),
                TransportPlanService.COMPLETED, UUID.randomUUID(), "Coord", List.of(), List.of()
        );
        when(planService.findById(planId, reporterId, false)).thenReturn(planResp);

        TransportPlanDto.Response result = deliveryService.complete(planId, reporterId);

        assertNotNull(result);
        assertEquals(TransportPlanService.COMPLETED, result.status());
        verify(planRepository).saveAndFlush(plan);
        verify(access).notify(eq(customerId), eq("PLAN_UPDATE"), anyString(), anyString(), eq("transport_plans"), eq(planId));
    }

    @Test
    void complete_idempotent_whenAlreadyCompleted() {
        plan.setStatus(TransportPlanService.COMPLETED);
        User user = new User();
        user.setUserId(reporterId);
        user.setRoleId("LOGISTICS_MANAGER");

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user));

        TransportPlanDto.Response planResp = new TransportPlanDto.Response(
                planId, requestId, "Route", LocalDateTime.now(), LocalDateTime.now().plusDays(1),
                TransportPlanService.COMPLETED, UUID.randomUUID(), "Coord", List.of(), List.of()
        );
        when(planService.findById(planId, reporterId, false)).thenReturn(planResp);

        TransportPlanDto.Response result = deliveryService.complete(planId, reporterId);
        assertNotNull(result);
        verify(planRepository, never()).saveAndFlush(any());
    }

    @Test
    void complete_throwsConflict_whenNotDeliveredYet() {
        User user = new User();
        user.setUserId(reporterId);
        user.setRoleId("FLEET_COORDINATOR");

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user));
        when(deliveryRepository.existsByPlanId(planId)).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class, () -> deliveryService.complete(planId, reporterId));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Cần ghi nhận bàn giao trước khi hoàn tất"));
    }

    @Test
    void complete_throwsConflict_whenHasOpenIncident() {
        User user = new User();
        user.setUserId(reporterId);
        user.setRoleId("LOGISTICS_MANAGER");

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(user));
        when(deliveryRepository.existsByPlanId(planId)).thenReturn(true);

        Incident openIncident = new Incident();
        openIncident.setStatus(IncidentService.OPEN);
        when(incidentRepository.findByPlanIdOrderByReportedAtDesc(planId)).thenReturn(List.of(openIncident));

        ApiException ex = assertThrows(ApiException.class, () -> deliveryService.complete(planId, reporterId));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Còn sự cố chưa được xử lý"));
    }

    @Test
    void findByPlan_success() {
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));

        Delivery d = new Delivery();
        d.setDeliveryId(UUID.randomUUID());
        d.setPlanId(planId);
        d.setRecipientName("Tran Van B");
        d.setSignatureImageUrl("http://example.com/sig.png");
        d.setDeliveredAt(LocalDateTime.now());
        when(deliveryRepository.findFirstByPlanIdOrderByDeliveredAtDesc(planId)).thenReturn(Optional.of(d));

        DeliveryDto.Response res = deliveryService.findByPlan(planId, reporterId, false, true);
        assertNotNull(res);
        assertEquals("Tran Van B", res.recipientName());
    }
}
