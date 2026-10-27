package com.equiflow.service;

import com.equiflow.dto.HorseRequest;
import com.equiflow.dto.HorseResponse;
import com.equiflow.entity.Horse;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.FileStorageService;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    private final HorseService service = new HorseService(
            horseRepository, userRepository, fileStorageService, crewAccess);

    @Test
    void customerListUsesOwnerScopedRepositoryQuery() {
        UUID customerId = UUID.randomUUID();
        when(horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(customerId)).thenReturn(java.util.List.of());

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
        when(crewAccess.assignedHorseIds(crewId)).thenReturn(java.util.Set.of(horseId));
        when(horseRepository.findByHorseIdInOrderByCreatedAtDesc(java.util.Set.of(horseId))).thenReturn(List.of(horse));

        service.findAll(crewId, false, true);

        verify(horseRepository).findByHorseIdInOrderByCreatedAtDesc(java.util.Set.of(horseId));
        verify(horseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    void crewCannotReadHorseOutsideAssignedPlans() {
        UUID crewId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        when(crewAccess.assignedHorseIds(crewId)).thenReturn(java.util.Set.of());

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
}
