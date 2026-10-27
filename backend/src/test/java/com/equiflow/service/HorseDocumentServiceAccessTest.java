package com.equiflow.service;

import com.equiflow.entity.Horse;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseDocumentRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;

class HorseDocumentServiceAccessTest {

    private final HorseDocumentRepository documentRepository = mock(HorseDocumentRepository.class);
    private final HorseRepository horseRepository = mock(HorseRepository.class);
    private final TransportRequestRepository requestRepository = mock(TransportRequestRepository.class);
    private final FileStorageService storage = mock(FileStorageService.class);
    private final CrewAssignmentAccessService crewAccess = mock(CrewAssignmentAccessService.class);
    private final HorseDocumentService service = new HorseDocumentService(
            documentRepository, horseRepository, requestRepository, storage, crewAccess);

    @Test
    void assignedCrewCannotReadDocumentsForHorseOutsideTheirPlans() {
        UUID crewId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        when(crewAccess.assignedHorseIds(crewId)).thenReturn(Set.of());

        var error = assertThrows(ApiException.class,
                () -> service.findByHorse(horseId, crewId, false, true));

        assertEquals(NOT_FOUND, error.getStatus());
        verify(horseRepository, never()).findById(horseId);
        verify(documentRepository, never()).findByHorseIdOrderByUploadedAtDesc(horseId);
    }

    @Test
    void assignedCrewCanReadDocumentsForHorseOnTheirPlan() {
        UUID crewId = UUID.randomUUID();
        UUID horseId = UUID.randomUUID();
        Horse horse = new Horse();
        horse.setHorseId(horseId);
        horse.setName("Comet");
        when(crewAccess.assignedHorseIds(crewId)).thenReturn(Set.of(horseId));
        when(horseRepository.findById(horseId)).thenReturn(Optional.of(horse));
        when(documentRepository.findByHorseIdOrderByUploadedAtDesc(horseId)).thenReturn(List.of());

        var documents = service.findByHorse(horseId, crewId, false, true);

        assertEquals(List.of(), documents);
        verify(documentRepository).findByHorseIdOrderByUploadedAtDesc(horseId);
    }
}
