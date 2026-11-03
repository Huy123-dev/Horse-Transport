package com.equiflow.service;

import com.equiflow.dto.HealthLogDto;
import com.equiflow.entity.HealthLog;
import com.equiflow.entity.Horse;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HealthLogRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class HealthLogService {

    /** Ghi sức khỏe khi chuyến đã sẵn sàng, đang thực hiện hoặc đã hoàn thành. */
    private static final Set<String> LOGGABLE = Set.of(
            TransportPlanService.READY, TransportPlanService.IN_PROGRESS, TransportPlanService.COMPLETED);

    private final HealthLogRepository healthRepository;
    private final TransportPlanRepository planRepository;
    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;
    private final CrewAssignmentAccessService crewAccess;

    public HealthLogService(HealthLogRepository healthRepository, TransportPlanRepository planRepository,
                            HorseRepository horseRepository, UserRepository userRepository,
                            RequestAccessService access, CrewAssignmentAccessService crewAccess) {
        this.healthRepository = healthRepository;
        this.planRepository = planRepository;
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.access = access;
        this.crewAccess = crewAccess;
    }

    /** Tài xế / người đi kèm được phân công ghi nhận sức khỏe ngựa trong chuyến. */
    @Transactional
    public HealthLogDto.Response create(HealthLogDto.Request req, UUID loggerId) {
        TransportPlan plan = planOrThrow(req.planId());
        if (!crewAccess.isAssigned(plan.getPlanId(), loggerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không được phân công cho kế hoạch vận chuyển này");
        }
        if (!LOGGABLE.contains(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ ghi nhận sức khỏe khi kế hoạch ở trạng thái sẵn sàng, đang thực hiện hoặc đã hoàn thành (hiện tại: "
                            + plan.getStatus() + ")");
        }
        String appetite = blankToNull(req.appetiteStatus());
        String notes = blankToNull(req.notes());
        String photo = blankToNull(req.photoUrl());
        if (req.stressLevel() == null && req.heartRate() == null && req.temperature() == null
                && appetite == null && notes == null && photo == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập ít nhất một chỉ số sức khỏe, ghi chú hoặc ảnh");
        }
        TransportRequest request = access.getOrThrow(plan.getRequestId());
        if (!request.getHorseIds().contains(req.horseId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngựa không thuộc kế hoạch vận chuyển này");
        }

        HealthLog log = new HealthLog();
        log.setPlanId(plan.getPlanId());
        log.setHorseId(req.horseId());
        log.setStressLevel(req.stressLevel());
        log.setHeartRate(req.heartRate());
        log.setTemperature(req.temperature() == null ? null : req.temperature().setScale(2, RoundingMode.HALF_UP));
        log.setAppetiteStatus(appetite);
        log.setNotes(notes);
        log.setPhotoUrl(photo);
        log.setLoggedBy(loggerId);
        return toResponses(List.of(healthRepository.save(log))).get(0);
    }

    @Transactional(readOnly = true)
    public List<HealthLogDto.Response> findByPlan(UUID planId, UUID currentUserId, boolean customer,
                                                  boolean driverEscort) {
        TransportPlan plan = planOrThrow(planId);
        if (customer) access.assertCustomerOwns(plan.getRequestId(), currentUserId);
        if (driverEscort) crewAccess.assertAssigned(planId, currentUserId);
        return toResponses(healthRepository.findByPlanIdOrderByLoggedAtDesc(planId));
    }

    @Transactional(readOnly = true)
    public List<HealthLogDto.Response> findByHorse(UUID horseId, UUID currentUserId, boolean customer,
                                                   boolean driverEscort) {
        if (driverEscort) {
            List<UUID> assignedPlanIds = crewAccess.assignedPlanIds(currentUserId);
            if (assignedPlanIds.isEmpty()) return List.of();
            return toResponses(healthRepository.findByHorseIdAndPlanIdInOrderByLoggedAtDesc(horseId, assignedPlanIds));
        }
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy ngựa"));
        if (customer && !currentUserId.equals(horse.getOwnerUserId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy ngựa");
        }
        return toResponses(healthRepository.findByHorseIdOrderByLoggedAtDesc(horseId));
    }

    @Transactional(readOnly = true)
    public HealthLogDto.Response findById(UUID id, UUID currentUserId, boolean customer, boolean driverEscort) {
        HealthLog log = healthRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        driverEscort ? "Không tìm thấy kế hoạch vận chuyển" : "Không tìm thấy bản ghi sức khỏe"));
        if (customer) {
            access.assertCustomerOwns(planOrThrow(log.getPlanId()).getRequestId(), currentUserId);
        }
        if (driverEscort) crewAccess.assertAssigned(log.getPlanId(), currentUserId);
        return toResponses(List.of(log)).get(0);
    }

    private TransportPlan planOrThrow(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private List<HealthLogDto.Response> toResponses(List<HealthLog> logs) {
        Set<UUID> horseIds = logs.stream().map(HealthLog::getHorseId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<UUID> userIds = logs.stream().map(HealthLog::getLoggedBy)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Horse> horses = horseRepository.findAllById(horseIds).stream()
                .collect(Collectors.toMap(Horse::getHorseId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        return logs.stream().map(l -> {
            Horse h = horses.get(l.getHorseId());
            User u = users.get(l.getLoggedBy());
            return new HealthLogDto.Response(l.getLogId(), l.getPlanId(), l.getHorseId(),
                    h == null ? null : h.getName(), l.getStressLevel(), l.getHeartRate(), l.getTemperature(),
                    l.getAppetiteStatus(), l.getNotes(), l.getPhotoUrl(), l.getLoggedAt(),
                    l.getLoggedBy(), u == null ? null : u.getName());
        }).toList();
    }
}
