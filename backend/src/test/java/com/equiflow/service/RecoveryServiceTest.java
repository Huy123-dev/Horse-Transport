package com.equiflow.service;

import com.equiflow.dto.RecoveryDashboardDto;
import com.equiflow.entity.HealthLog;
import com.equiflow.entity.Horse;
import com.equiflow.repository.HealthLogRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecoveryServiceTest {

    @Mock
    private HorseRepository horseRepository;

    @Mock
    private HealthLogRepository healthLogRepository;

    @Mock
    private TransportPlanRepository planRepository;

    @Mock
    private TransportRequestRepository requestRepository;

    @Mock
    private LocationRepository locationRepository;

    @Mock
    private UserRepository userRepository;

    private RecoveryService recoveryService;

    @BeforeEach
    void setUp() {
        recoveryService = new RecoveryService(
                horseRepository,
                healthLogRepository,
                planRepository,
                requestRepository,
                locationRepository,
                userRepository
        );
    }

    @Test
    void getRecoveryDashboard_returnsCorrectStats_forStableHorse() {
        UUID customerId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();

        Horse horse = new Horse();
        horse.setHorseId(horseId);
        horse.setName("Sakura Ace");
        horse.setMicrochipId("MC-001");
        horse.setGender("Duc");
        horse.setOwnerUserId(customerId);

        HealthLog log = new HealthLog();
        log.setLogId(UUID.randomUUID());
        log.setHorseId(horseId);
        log.setStressLevel(2);
        log.setHeartRate(40);
        log.setTemperature(new BigDecimal("37.5"));
        log.setAppetiteStatus("Tot");
        log.setLoggedAt(LocalDateTime.now());
        log.setLoggedBy(UUID.randomUUID());

        when(horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(horse));
        when(healthLogRepository.findByHorseIdOrderByLoggedAtDesc(horseId))
                .thenReturn(List.of(log));

        RecoveryDashboardDto.Response response = recoveryService.getRecoveryDashboard(customerId, true);

        assertThat(response).isNotNull();
        assertThat(response.stats().totalHorses()).isEqualTo(1);
        assertThat(response.stats().readyCount()).isEqualTo(1);
        assertThat(response.stats().recoveringCount()).isZero();
        assertThat(response.stats().needsAttentionCount()).isZero();
        assertThat(response.summary()).hasSize(1);
        assertThat(response.summary().get(0).latestStage()).isEqualTo("Đã hồi phục");
        assertThat(response.summary().get(0).readyToRace()).isTrue();
    }

    @Test
    void getRecoveryDashboard_evaluatesRecoveringAndNeedsAttentionStages() {
        UUID customerId = UUID.randomUUID();
        UUID horseOneId = UUID.randomUUID();
        UUID horseTwoId = UUID.randomUUID();

        Horse horseOne = new Horse();
        horseOne.setHorseId(horseOneId);
        horseOne.setName("Hayate");
        horseOne.setMicrochipId("MC-002");
        horseOne.setGender("Cai");
        horseOne.setOwnerUserId(customerId);

        Horse horseTwo = new Horse();
        horseTwo.setHorseId(horseTwoId);
        horseTwo.setName("Storm");
        horseTwo.setMicrochipId("MC-003");
        horseTwo.setGender("Duc");
        horseTwo.setOwnerUserId(customerId);

        HealthLog logRecovering = new HealthLog();
        logRecovering.setLogId(UUID.randomUUID());
        logRecovering.setHorseId(horseOneId);
        logRecovering.setStressLevel(5);
        logRecovering.setHeartRate(46);
        logRecovering.setTemperature(new BigDecimal("38.2"));
        logRecovering.setAppetiteStatus("Hoi kem");
        logRecovering.setLoggedAt(LocalDateTime.now());
        logRecovering.setLoggedBy(UUID.randomUUID());

        HealthLog logSevere = new HealthLog();
        logSevere.setLogId(UUID.randomUUID());
        logSevere.setHorseId(horseTwoId);
        logSevere.setStressLevel(8);
        logSevere.setHeartRate(62);
        logSevere.setTemperature(new BigDecimal("39.2"));
        logSevere.setAppetiteStatus("Bo an");
        logSevere.setLoggedAt(LocalDateTime.now());
        logSevere.setLoggedBy(UUID.randomUUID());

        when(horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(horseOne, horseTwo));
        when(healthLogRepository.findByHorseIdOrderByLoggedAtDesc(horseOneId))
                .thenReturn(List.of(logRecovering));
        when(healthLogRepository.findByHorseIdOrderByLoggedAtDesc(horseTwoId))
                .thenReturn(List.of(logSevere));

        RecoveryDashboardDto.Response response = recoveryService.getRecoveryDashboard(customerId, true);

        assertThat(response.stats().totalHorses()).isEqualTo(2);
        assertThat(response.stats().readyCount()).isZero();
        assertThat(response.stats().recoveringCount()).isEqualTo(1);
        assertThat(response.stats().needsAttentionCount()).isEqualTo(1);
    }
}
