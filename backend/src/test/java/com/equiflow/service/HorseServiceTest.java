package com.equiflow.service;

import com.equiflow.dto.HorseAvailabilityDto;
import com.equiflow.dto.HorseRequest;
import com.equiflow.dto.HorseResponse;
import com.equiflow.entity.Horse;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;

class HorseServiceTest {

    private final HorseRepository horseRepository = mock(HorseRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final FileStorageService fileStorageService = mock(FileStorageService.class);
    private final CrewAssignmentAccessService crewAccess = mock(CrewAssignmentAccessService.class);
    private final HorseReservationService horseReservationService = mock(HorseReservationService.class);

    private final HorseService service = new HorseService(
            horseRepository, userRepository, fileStorageService, crewAccess);

    private final HorseService serviceWithReservation = new HorseService(
            horseRepository, userRepository, fileStorageService, crewAccess, horseReservationService);

    @Test
    void customerListUsesOwnerScopedRepositoryQuery() {
        UUID customerId = UUID.randomUUID();
        when(horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(customerId)).thenReturn(List.of());

        service.findAll(customerId, true);

        verify(horseRepository).findByOwnerUserIdOrderByCreatedAtDesc(customerId);
        verify(horseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    void customerCannotReadAnotherOwnersHorseById() {
        UUID customerId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        Horse horse = mock(Horse.class);
        when(horseRepository.findById(horseId)).thenReturn(Optional.of(horse));
        when(horse.getOwnerUserId()).thenReturn(UUID.randomUUID());

        ApiException error = assertThrows(
                ApiException.class,
                () -> service.findById(horseId, customerId, true));

        assertEquals(NOT_FOUND, error.getStatus());
        verify(userRepository, never()).findById(customerId);
    }

    @Test
    void crewListOnlyIncludesHorsesFromAssignedPlans() {
        UUID crewId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        Horse horse = new Horse();
        horse.setHorseId(horseId);
        when(crewAccess.assignedHorseIds(crewId)).thenReturn(Set.of(horseId));
        when(horseRepository.findByHorseIdInOrderByCreatedAtDesc(Set.of(horseId))).thenReturn(List.of(horse));

        service.findAll(crewId, false, true);

        verify(horseRepository).findByHorseIdInOrderByCreatedAtDesc(Set.of(horseId));
        verify(horseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    void crewCannotReadHorseOutsideAssignedPlans() {
        UUID crewId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        when(crewAccess.assignedHorseIds(crewId)).thenReturn(Set.of());

        ApiException error = assertThrows(ApiException.class,
                () -> service.findById(horseId, crewId, false, true));

        assertEquals(NOT_FOUND, error.getStatus());
        verify(horseRepository, never()).findById(horseId);
    }

    @Test
    void createNormalizesUploadedHorseImageToBackendRelativePath() {
        UUID customerId = UUID.randomUUID();
        String uploadedUrl = "http://localhost:8080/uploads/image-key.jpg";
        String storedPath = "/uploads/image-key.jpg";
        when(horseRepository.existsByMicrochipId("CHIP-1")).thenReturn(false);
        when(fileStorageService.normalizePublicImageUrl(uploadedUrl)).thenReturn(storedPath);
        when(horseRepository.saveAndFlush(any(Horse.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        HorseResponse response = service.create(
                new HorseRequest("CHIP-1", "Sao Bang", "Duc", null, null, null, null, null, uploadedUrl),
                customerId,
                true);

        assertEquals(storedPath, response.imageUrl());
    }

    @Test
    void createAndMapAllHorsePhysicalProfileFields() {
        UUID customerId = UUID.randomUUID();
        when(horseRepository.existsByMicrochipId("CHIP-PROFILE")).thenReturn(false);
        when(horseRepository.saveAndFlush(any(Horse.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        HorseRequest req = new HorseRequest(
                "CHIP-PROFILE",
                "Xích Thố",
                "Duc",
                "Thoroughbred",
                2020,
                new BigDecimal("510.5"),
                new BigDecimal("165.2"),
                7,
                "Champion bloodline",
                "Khoe manh",
                "Khong",
                "On hoa",
                null,
                null
        );

        HorseResponse res = service.create(req, customerId, true);
        assertEquals("Thoroughbred", res.breed());
        assertEquals(2020, res.birthYear());
        assertEquals(new BigDecimal("510.5"), res.weightKg());
        assertEquals(new BigDecimal("165.2"), res.heightCm());
        assertEquals(7, res.recoveryDays());
    }

    @Test
    void checkAvailabilityDelegatesToHorseReservationService() {
        UUID horseId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        HorseAvailabilityDto availDto = new HorseAvailabilityDto(
                horseId, false, "IN_TRANSIT", "Đang trong chuyến vận chuyển",
                UUID.randomUUID(), "CONFIRMED", "IN_PROGRESS", "Đang vận chuyển");

        when(horseReservationService.getAvailabilityMap(List.of(horseId)))
                .thenReturn(Map.of(horseId, availDto));

        Map<UUID, HorseAvailabilityDto> result = serviceWithReservation.checkAvailability(
                List.of(horseId), userId, false);

        assertNotNull(result);
        assertEquals(availDto, result.get(horseId));
        assertFalse(result.get(horseId).available());
    }

    @Test
    void getAvailabilityDelegatesToHorseReservationService() {
        UUID horseId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        HorseAvailabilityDto availDto = new HorseAvailabilityDto(
                horseId, true, "AVAILABLE", "Khả dụng", null, null, null, null);

        when(horseReservationService.getAvailability(horseId)).thenReturn(availDto);

        HorseAvailabilityDto result = serviceWithReservation.getAvailability(horseId, userId, false);

        assertNotNull(result);
        assertTrue(result.available());
        assertEquals("AVAILABLE", result.status());
    }

    @Test
    void customerCannotCheckAnotherOwnersHorseAvailability() {
        UUID customerId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        Horse horse = new Horse();
        horse.setHorseId(horseId);
        horse.setOwnerUserId(UUID.randomUUID());
        when(horseRepository.findById(horseId)).thenReturn(Optional.of(horse));

        ApiException error = assertThrows(ApiException.class,
                () -> serviceWithReservation.getAvailability(horseId, customerId, true));

        assertEquals(NOT_FOUND, error.getStatus());
        verify(horseReservationService, never()).getAvailability(horseId);
    }

    @Test
    void customerAvailabilityListIgnoresUnownedHorseIds() {
        UUID customerId = UUID.randomUUID();
        UUID ownedHorseId = UUID.randomUUID();
        UUID unownedHorseId = UUID.randomUUID();
        Horse ownedHorse = new Horse();
        ownedHorse.setHorseId(ownedHorseId);
        when(horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(customerId)).thenReturn(List.of(ownedHorse));
        when(horseReservationService.getAvailabilityMap(List.of(ownedHorseId))).thenReturn(Map.of());

        serviceWithReservation.checkAvailability(
                List.of(ownedHorseId, unownedHorseId, ownedHorseId), customerId, true);

        verify(horseReservationService).getAvailabilityMap(List.of(ownedHorseId));
    }

    @Test
    void fallbackAvailabilityWhenHorseReservationServiceIsNull() {
        UUID horseId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        HorseAvailabilityDto result = service.getAvailability(horseId, userId, false);

        assertNotNull(result);
        assertTrue(result.available());
        assertEquals("AVAILABLE", result.status());
    }
}
