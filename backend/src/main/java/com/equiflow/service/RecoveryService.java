package com.equiflow.service;

import com.equiflow.dto.RecoveryDashboardDto;
import com.equiflow.entity.HealthLog;
import com.equiflow.entity.Horse;
import com.equiflow.entity.Location;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.repository.HealthLogRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Transactional(readOnly = true)
public class RecoveryService {

    private final HorseRepository horseRepository;
    private final HealthLogRepository healthLogRepository;
    private final TransportPlanRepository planRepository;
    private final TransportRequestRepository requestRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;

    public RecoveryService(
            HorseRepository horseRepository,
            HealthLogRepository healthLogRepository,
            TransportPlanRepository planRepository,
            TransportRequestRepository requestRepository,
            LocationRepository locationRepository,
            UserRepository userRepository
    ) {
        this.horseRepository = horseRepository;
        this.healthLogRepository = healthLogRepository;
        this.planRepository = planRepository;
        this.requestRepository = requestRepository;
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
    }

    public RecoveryDashboardDto.Response getRecoveryDashboard(UUID currentUserId, boolean isCustomer) {
        List<Horse> horses;
        if (isCustomer && currentUserId != null) {
            horses = horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(currentUserId);
        } else {
            horses = horseRepository.findAllByOrderByCreatedAtDesc();
        }

        int readyCount = 0;
        int recoveringCount = 0;
        int needsAttentionCount = 0;

        List<RecoveryDashboardDto.HorseSummary> summaryList = new ArrayList<>();
        List<RecoveryDashboardDto.RecentRecoveryItem> allRecentRecoveries = new ArrayList<>();

        Map<UUID, TransportPlan> planCache = new ConcurrentHashMap<>();
        Map<UUID, TransportRequest> requestCache = new ConcurrentHashMap<>();
        Map<UUID, Location> locationCache = new ConcurrentHashMap<>();
        Map<UUID, String> userNameCache = new ConcurrentHashMap<>();

        for (Horse horse : horses) {
            RecoveryDashboardDto.HorseInfo horseInfo = new RecoveryDashboardDto.HorseInfo(
                    horse.getHorseId(),
                    horse.getName(),
                    horse.getMicrochipId(),
                    horse.getGender(),
                    horse.getPedigree(),
                    horse.getImageUrl()
            );

            List<HealthLog> healthLogs = healthLogRepository.findByHorseIdOrderByLoggedAtDesc(horse.getHorseId());
            HealthLog latestLog = healthLogs.isEmpty() ? null : healthLogs.get(0);
            StageEvaluation eval = evaluateHealth(latestLog);

            if (eval.stage().equals("Đã hồi phục")) {
                readyCount++;
            } else if (eval.stage().equals("Đang hồi phục")) {
                recoveringCount++;
            } else {
                needsAttentionCount++;
            }

            List<RecoveryDashboardDto.Assessment> assessments = new ArrayList<>();
            for (HealthLog hl : healthLogs) {
                RecoveryDashboardDto.PlanInfo planInfo = buildPlanInfo(hl.getPlanId(), planCache, requestCache, locationCache);
                String loggedByName = userNameCache.computeIfAbsent(hl.getLoggedBy(), id ->
                        userRepository.findById(id).map(User::getName).orElse("Bác sĩ thú y / Tài xế"));

                RecoveryDashboardDto.Assessment assessment = new RecoveryDashboardDto.Assessment(
                        hl.getLogId(),
                        hl.getPlanId(),
                        planInfo,
                        hl.getLoggedAt(),
                        hl.getStressLevel(),
                        hl.getHeartRate(),
                        hl.getTemperature(),
                        hl.getAppetiteStatus(),
                        hl.getNotes(),
                        loggedByName
                );
                assessments.add(assessment);

                StageEvaluation logEval = evaluateHealth(hl);
                allRecentRecoveries.add(new RecoveryDashboardDto.RecentRecoveryItem(
                        hl.getLogId(),
                        horseInfo,
                        logEval.stage(),
                        logEval.readyToRace(),
                        hl.getLoggedAt(),
                        hl.getNotes(),
                        planInfo
                ));
            }

            summaryList.add(new RecoveryDashboardDto.HorseSummary(
                    horseInfo,
                    eval.stage(),
                    eval.readyToRace(),
                    assessments
            ));
        }

        allRecentRecoveries.sort(Comparator.comparing(RecoveryDashboardDto.RecentRecoveryItem::assessmentDate).reversed());
        if (allRecentRecoveries.size() > 20) {
            allRecentRecoveries = allRecentRecoveries.subList(0, 20);
        }

        RecoveryDashboardDto.Stats stats = new RecoveryDashboardDto.Stats(
                horses.size(),
                readyCount,
                recoveringCount,
                needsAttentionCount
        );

        return new RecoveryDashboardDto.Response(stats, summaryList, allRecentRecoveries);
    }

    private RecoveryDashboardDto.PlanInfo buildPlanInfo(
            UUID planId,
            Map<UUID, TransportPlan> planCache,
            Map<UUID, TransportRequest> requestCache,
            Map<UUID, Location> locationCache
    ) {
        if (planId == null) {
            return null;
        }

        TransportPlan plan = planCache.computeIfAbsent(planId, id ->
                planRepository.findById(id).orElse(null));
        if (plan == null) {
            return new RecoveryDashboardDto.PlanInfo(planId, null);
        }

        TransportRequest req = plan.getRequestId() != null
                ? requestCache.computeIfAbsent(plan.getRequestId(), id -> requestRepository.findById(id).orElse(null))
                : null;

        RecoveryDashboardDto.RequestInfo reqInfo = null;
        if (req != null) {
            Location origin = req.getOriginLocationId() != null
                    ? locationCache.computeIfAbsent(req.getOriginLocationId(), id -> locationRepository.findById(id).orElse(null))
                    : null;
            Location dest = req.getDestinationLocationId() != null
                    ? locationCache.computeIfAbsent(req.getDestinationLocationId(), id -> locationRepository.findById(id).orElse(null))
                    : null;

            RecoveryDashboardDto.LocationInfo originInfo = origin != null ? new RecoveryDashboardDto.LocationInfo(origin.getName()) : null;
            RecoveryDashboardDto.LocationInfo destInfo = dest != null ? new RecoveryDashboardDto.LocationInfo(dest.getName()) : null;

            reqInfo = new RecoveryDashboardDto.RequestInfo(originInfo, destInfo, req.getSpecialRequirements());
        }

        return new RecoveryDashboardDto.PlanInfo(planId, reqInfo);
    }

    private StageEvaluation evaluateHealth(HealthLog log) {
        if (log == null) {
            return new StageEvaluation("Đã hồi phục", true);
        }

        int stress = log.getStressLevel() != null ? log.getStressLevel() : 1;
        BigDecimal temp = log.getTemperature();
        int hr = log.getHeartRate() != null ? log.getHeartRate() : 38;
        String appetite = log.getAppetiteStatus() != null ? log.getAppetiteStatus().trim().toLowerCase() : "";

        boolean isSevereStress = stress >= 8;
        boolean isSevereTemp = temp != null && temp.compareTo(new BigDecimal("39.0")) > 0;
        boolean isSevereHr = hr > 60;

        if (isSevereStress || isSevereTemp || isSevereHr) {
            return new StageEvaluation("Cần can thiệp", false);
        }

        boolean isWarningStress = stress >= 6;
        boolean isWarningTemp = temp != null && temp.compareTo(new BigDecimal("38.5")) > 0;
        boolean isWarningHr = hr > 50;
        boolean isPoorAppetite = appetite.contains("kém") || appetite.contains("bỏ ăn") || appetite.contains("poor");

        if (isWarningStress || isWarningTemp || isWarningHr || isPoorAppetite) {
            return new StageEvaluation("Theo dõi", false);
        }

        if (stress >= 4 || (temp != null && temp.compareTo(new BigDecimal("38.0")) > 0) || hr > 44) {
            return new StageEvaluation("Đang hồi phục", false);
        }

        return new StageEvaluation("Đã hồi phục", true);
    }

    private record StageEvaluation(String stage, boolean readyToRace) {}
}
