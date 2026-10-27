package com.equiflow.service;

import com.equiflow.dto.IncidentDto;
import com.equiflow.entity.Incident;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.repository.IncidentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IncidentServiceNotificationTest {

    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private TransportPlanRepository planRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RequestAccessService access;
    @Mock
    private CrewAssignmentAccessService crewAccess;

    @InjectMocks
    private IncidentService service;

    @Test
    void urgentIncidentNotifiesCustomerAndOperationsStaff() {
        UUID planId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID reporterId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();
        TransportPlan plan = plan(planId, requestId);
        User manager = new User();
        manager.setUserId(managerId);
        TransportRequest request = new TransportRequest();
        request.setCustomerId(customerId);

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(crewAccess.isAssigned(planId, reporterId)).thenReturn(true);
        when(userRepository.findByRoleId("LOGISTICS_MANAGER")).thenReturn(List.of(manager));
        when(access.getOrThrow(requestId)).thenReturn(request);
        when(incidentRepository.save(any(Incident.class))).thenAnswer(invocation -> {
            Incident incident = invocation.getArgument(0);
            incident.setIncidentId(incidentId);
            return incident;
        });
        when(userRepository.findAllById(any())).thenReturn(List.of());

        service.create(new IncidentDto.Request(
                planId, "Y tế", "Ngựa cần được kiểm tra", true, null, null, null), reporterId);

        verify(access).notify(customerId, "INCIDENT_SOS",
                "SOS: sự cố khẩn cấp trên chuyến vận chuyển",
                "Đã ghi nhận sự cố khẩn cấp trên chuyến vận chuyển của bạn. Nhân sự vận hành đã được thông báo.",
                "incidents", incidentId);
        verify(access).notify(managerId, "INCIDENT_SOS",
                "SOS: sự cố khẩn cấp trên chuyến vận chuyển",
                "Sự cố \"Y tế\" tại kế hoạch " + planId + ".",
                "incidents", incidentId);
    }

    @Test
    void resolvingIncidentNotifiesItsCustomer() {
        UUID planId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();
        TransportPlan plan = plan(planId, requestId);
        TransportRequest request = new TransportRequest();
        request.setCustomerId(customerId);
        Incident incident = new Incident();
        incident.setIncidentId(incidentId);
        incident.setPlanId(planId);
        incident.setStatus(IncidentService.OPEN);
        User driver = new User();
        driver.setRoleId("DRIVER_ESCORT");

        when(incidentRepository.findById(incidentId)).thenReturn(Optional.of(incident));
        when(userRepository.findById(driverId)).thenReturn(Optional.of(driver));
        when(crewAccess.isAssigned(planId, driverId)).thenReturn(true);
        when(incidentRepository.save(incident)).thenReturn(incident);
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(access.getOrThrow(requestId)).thenReturn(request);
        when(userRepository.findAllById(any())).thenReturn(List.of());

        service.resolve(incidentId, driverId);

        verify(access).notify(customerId, "PLAN_UPDATE", "Sự cố đã được xử lý",
                "Đội ngũ vận hành đã cập nhật sự cố trên chuyến vận chuyển của bạn thành đã xử lý.",
                "incidents", incidentId);
    }

    private static TransportPlan plan(UUID planId, UUID requestId) {
        TransportPlan plan = new TransportPlan();
        plan.setPlanId(planId);
        plan.setRequestId(requestId);
        plan.setStatus(TransportPlanService.IN_PROGRESS);
        return plan;
    }
}
