package com.equiflow.service;

import com.equiflow.exception.ApiException;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CrewAssignmentAccessService {

    private final TransportAssignmentRepository assignmentRepository;
    private final TransportPlanRepository planRepository;
    private final TransportRequestRepository requestRepository;

    public CrewAssignmentAccessService(TransportAssignmentRepository assignmentRepository,
                                       TransportPlanRepository planRepository,
                                       TransportRequestRepository requestRepository) {
        this.assignmentRepository = assignmentRepository;
        this.planRepository = planRepository;
        this.requestRepository = requestRepository;
    }

    @Transactional(readOnly = true)
    public List<UUID> assignedPlanIds(UUID userId) {
        return assignmentRepository.findAssignedPlanIds(userId);
    }

    @Transactional(readOnly = true)
    public List<UUID> assignedPlanIds(UUID userId, String staffType) {
        if ("DRIVER".equalsIgnoreCase(staffType)) {
            return assignmentRepository.findDriverPlanIds(userId);
        }
        if ("ESCORT".equalsIgnoreCase(staffType)) {
            return assignmentRepository.findAttendantPlanIds(userId);
        }
        return assignmentRepository.findAssignedPlanIds(userId);
    }

    @Transactional(readOnly = true)
    public Set<UUID> assignedCrewUserIds(UUID planId) {
        return assignmentRepository.findByPlanIdOrderByAssignedAtAsc(planId).stream()
                .flatMap(a -> java.util.stream.Stream.of(a.getDriverUserId(), a.getAttendantUserId()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
    }


    @Transactional(readOnly = true)
    public boolean isAssigned(UUID planId, UUID userId) {
        return assignmentRepository.countCrewAssignments(planId, userId) > 0;
    }

    @Transactional(readOnly = true)
    public void assertAssigned(UUID planId, UUID userId) {
        if (!isAssigned(planId, userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển");
        }
    }

    @Transactional(readOnly = true)
    public Set<UUID> assignedHorseIds(UUID userId) {
        List<UUID> planIds = assignedPlanIds(userId);
        if (planIds.isEmpty()) return Set.of();
        Set<UUID> requestIds = planRepository.findAllById(planIds).stream()
                .map(TransportPlan::getRequestId)
                .collect(Collectors.toSet());
        if (requestIds.isEmpty()) return Set.of();
        return requestRepository.findAllById(requestIds).stream()
                .flatMap(request -> request.getHorseIds().stream())
                .collect(Collectors.toSet());
    }
}
