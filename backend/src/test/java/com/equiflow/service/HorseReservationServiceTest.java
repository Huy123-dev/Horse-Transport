package com.equiflow.service;

import com.equiflow.dto.HorseAvailabilityDto;
import com.equiflow.entity.Horse;
import com.equiflow.entity.HorseTransportReservation;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.HorseTransportReservationRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HorseReservationServiceTest {

    private final HorseTransportReservationRepository reservationRepository = mock(HorseTransportReservationRepository.class);
    private final HorseRepository horseRepository = mock(HorseRepository.class);
    private final TransportRequestRepository requestRepository = mock(TransportRequestRepository.class);
    private final TransportPlanRepository planRepository = mock(TransportPlanRepository.class);

    private HorseReservationService reservationService;

    @BeforeEach
    void setUp() {
        reservationService = new HorseReservationService(
                reservationRepository,
                horseRepository,
                requestRepository,
                planRepository
        );
    }

    @Test
    void validateHorsesAvailableSucceedsWhenNoActiveReservations() {
        UUID h1 = UUID.randomUUID();
        UUID h2 = UUID.randomUUID();

        when(reservationRepository.findByHorseIdInAndStatus(anyCollection(), eq("ACTIVE"))).thenReturn(List.of());

        assertDoesNotThrow(() -> reservationService.validateHorsesAvailable(List.of(h1, h2)));
    }

    @Test
    void validateHorsesAvailableThrowsConflictWhenHorseIsReserved() {
        UUID h1 = UUID.randomUUID();
        UUID reqId = UUID.randomUUID();

        HorseTransportReservation activeRes = new HorseTransportReservation();
        activeRes.setHorseId(h1);
        activeRes.setRequestId(reqId);
        activeRes.setStatus("ACTIVE");

        Horse horse = new Horse();
        horse.setHorseId(h1);
        horse.setName("Rising Sun");

        when(reservationRepository.findByHorseIdInAndStatus(anyCollection(), eq("ACTIVE"))).thenReturn(List.of(activeRes));
        when(horseRepository.findAllById(anyCollection())).thenReturn(List.of(horse));

        ApiException ex = assertThrows(ApiException.class, () -> reservationService.validateHorsesAvailable(List.of(h1)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Rising Sun"));
        assertTrue(ex.getMessage().contains("đang thuộc đơn vận chuyển chưa hoàn tất"));
    }

    @Test
    void reserveHorsesForRequestSavesActiveReservations() {
        UUID reqId = UUID.randomUUID();
        UUID h1 = UUID.randomUUID();
        UUID h2 = UUID.randomUUID();

        when(reservationRepository.findByHorseIdInAndStatus(anyCollection(), eq("ACTIVE"))).thenReturn(List.of());

        assertDoesNotThrow(() -> reservationService.reserveHorsesForRequest(reqId, List.of(h1, h2)));

        verify(reservationRepository).saveAllAndFlush(argThat(iterable -> {
            List<HorseTransportReservation> list = (List<HorseTransportReservation>) iterable;
            return list.size() == 2 && list.stream().allMatch(r -> "ACTIVE".equals(r.getStatus()) && reqId.equals(r.getRequestId()));
        }));
    }

    @Test
    void reserveHorsesForRequestCatchesUniqueConstraintViolation() {
        UUID reqId = UUID.randomUUID();
        UUID h1 = UUID.randomUUID();

        when(reservationRepository.findByHorseIdInAndStatus(anyCollection(), eq("ACTIVE"))).thenReturn(List.of());
        doThrow(new DataIntegrityViolationException("Unique index violation")).when(reservationRepository).saveAllAndFlush(any());

        ApiException ex = assertThrows(ApiException.class, () -> reservationService.reserveHorsesForRequest(reqId, List.of(h1)));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("vừa được sử dụng trong một đơn khác"));
    }

    @Test
    void releaseHorsesForRequestUpdatesStatusToReleased() {
        UUID reqId = UUID.randomUUID();
        UUID h1 = UUID.randomUUID();

        HorseTransportReservation activeRes = new HorseTransportReservation();
        activeRes.setHorseId(h1);
        activeRes.setRequestId(reqId);
        activeRes.setStatus("ACTIVE");

        when(reservationRepository.findByRequestIdAndStatus(reqId, "ACTIVE")).thenReturn(List.of(activeRes));

        reservationService.releaseHorsesForRequest(reqId, "REJECTED");

        assertEquals("RELEASED", activeRes.getStatus());
        assertEquals("REJECTED", activeRes.getReleaseReason());
        assertNotNull(activeRes.getReleasedAt());
        verify(reservationRepository).saveAllAndFlush(anyList());
    }

    @Test
    void getAvailabilityMapDistinguishesInRequestAndInTransit() {
        UUID hAvailable = UUID.randomUUID();
        UUID hInRequest = UUID.randomUUID();
        UUID hInTransit = UUID.randomUUID();

        UUID req1 = UUID.randomUUID();
        UUID req2 = UUID.randomUUID();

        HorseTransportReservation res1 = new HorseTransportReservation();
        res1.setHorseId(hInRequest);
        res1.setRequestId(req1);
        res1.setStatus("ACTIVE");

        HorseTransportReservation res2 = new HorseTransportReservation();
        res2.setHorseId(hInTransit);
        res2.setRequestId(req2);
        res2.setStatus("ACTIVE");

        when(reservationRepository.findByHorseIdInAndStatus(anyCollection(), eq("ACTIVE"))).thenReturn(List.of(res1, res2));

        TransportRequest tr1 = new TransportRequest();
        tr1.setRequestId(req1);
        tr1.setStatus("Dang tham dinh");

        TransportRequest tr2 = new TransportRequest();
        tr2.setRequestId(req2);
        tr2.setStatus("Da phe duyet");

        when(requestRepository.findAllById(anyCollection())).thenReturn(List.of(tr1, tr2));

        TransportPlan planTransit = new TransportPlan();
        planTransit.setRequestId(req2);
        planTransit.setStatus("Dang thuc hien");

        when(planRepository.findByRequestId(req1)).thenReturn(List.of());
        when(planRepository.findByRequestId(req2)).thenReturn(List.of(planTransit));

        Map<UUID, HorseAvailabilityDto> map = reservationService.getAvailabilityMap(List.of(hAvailable, hInRequest, hInTransit));

        // Available horse
        assertTrue(map.get(hAvailable).available());
        assertEquals("AVAILABLE", map.get(hAvailable).status());
        assertEquals("Khả dụng", map.get(hAvailable).statusLabel());

        // In Request horse
        assertFalse(map.get(hInRequest).available());
        assertEquals("IN_REQUEST", map.get(hInRequest).status());
        assertEquals("Đang có đơn vận chuyển", map.get(hInRequest).statusLabel());

        // In Transit horse
        assertFalse(map.get(hInTransit).available());
        assertEquals("IN_TRANSIT", map.get(hInTransit).status());
        assertEquals("Đang trong chuyến vận chuyển", map.get(hInTransit).statusLabel());
    }
}
