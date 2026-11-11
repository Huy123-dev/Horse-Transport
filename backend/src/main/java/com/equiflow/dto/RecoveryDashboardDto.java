package com.equiflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class RecoveryDashboardDto {

    private RecoveryDashboardDto() {}

    @Schema(name = "RecoveryStats")
    public record Stats(
            int totalHorses,
            int readyCount,
            int recoveringCount,
            int needsAttentionCount
    ) {}

    @Schema(name = "RecoveryHorseInfo")
    public record HorseInfo(
            UUID horseId,
            String name,
            String microchipId,
            String gender,
            String breed,
            String imageUrl
    ) {}

    @Schema(name = "RecoveryLocationInfo")
    public record LocationInfo(
            String name
    ) {}

    @Schema(name = "RecoveryRequestInfo")
    public record RequestInfo(
            LocationInfo origin,
            LocationInfo destination,
            String competitionName
    ) {}

    @Schema(name = "RecoveryPlanInfo")
    public record PlanInfo(
            UUID planId,
            RequestInfo request
    ) {}

    @Schema(name = "RecoveryAssessment")
    public record Assessment(
            UUID recoveryId,
            UUID planId,
            PlanInfo plan,
            LocalDateTime assessmentDate,
            Integer stressLevel,
            Integer heartRate,
            BigDecimal temperature,
            String appetiteStatus,
            String vetNotes,
            String loggedByName
    ) {}

    @Schema(name = "HorseRecoverySummary")
    public record HorseSummary(
            HorseInfo horse,
            String latestStage,
            boolean readyToRace,
            List<Assessment> assessments
    ) {}

    @Schema(name = "RecentRecoveryItem")
    public record RecentRecoveryItem(
            UUID recoveryId,
            HorseInfo horse,
            String recoveryStage,
            boolean readyToRace,
            LocalDateTime assessmentDate,
            String vetNotes,
            PlanInfo plan
    ) {}

    @Schema(name = "RecoveryDashboardResponse")
    public record Response(
            Stats stats,
            List<HorseSummary> summary,
            List<RecentRecoveryItem> recoveries
    ) {}
}
