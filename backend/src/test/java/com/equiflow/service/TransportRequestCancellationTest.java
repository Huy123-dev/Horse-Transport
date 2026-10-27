package com.equiflow.service;

import com.equiflow.dto.TransportRequestResponse;
import com.equiflow.entity.TransportRequest;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.NotificationRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.TransportRequestStallRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransportRequestCancellationTest {

    @Mock private TransportRequestRepository requestRepository;
    @Mock private HorseRepository horseRepository;
    @Mock private LocationRepository locationRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private TransportRequestStallRepository stallRepository;
    @Mock private PricingService pricingService;

    @InjectMocks private TransportRequestService service;

    @Test
    void cancellationPersistsReasonActorAndTimestamp() {
        UUID requestId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        TransportRequest request = pendingRequest(requestId, customerId);
        when(requestRepository.findByIdForUpdate(requestId)).thenReturn(Optional.of(request));
        when(requestRepository.saveAndFlush(request)).thenReturn(request);
        when(userRepository.findByRoleId("LOGISTICS_MANAGER")).thenReturn(List.of());
        when(userRepository.findAllById(anyIterable())).thenReturn(List.of());
        when(locationRepository.findAllById(anyIterable())).thenReturn(List.of());
        when(horseRepository.findAllById(anyIterable())).thenReturn(List.of());

        TransportRequestResponse response = service.cancel(requestId, customerId, "  Kế hoạch thay đổi  ");

        assertEquals(TransportRequestService.CANCELLED, response.status());
        assertEquals(customerId, response.cancelledBy());
        assertNotNull(response.cancelledAt());
        assertEquals("Kế hoạch thay đổi", response.cancellationReason());
        verify(notificationRepository).saveAll(List.of());
    }

    @Test
    void cancellationCannotBePerformedByAnotherCustomer() {
        UUID requestId = UUID.randomUUID();
        TransportRequest request = pendingRequest(requestId, UUID.randomUUID());
        when(requestRepository.findByIdForUpdate(requestId)).thenReturn(Optional.of(request));

        ApiException error = assertThrows(ApiException.class,
                () -> service.cancel(requestId, UUID.randomUUID(), "Lý do"));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(requestRepository, never()).saveAndFlush(request);
    }

    private static TransportRequest pendingRequest(UUID requestId, UUID customerId) {
        TransportRequest request = new TransportRequest();
        request.setRequestId(requestId);
        request.setCustomerId(customerId);
        request.setOriginLocationId(UUID.randomUUID());
        request.setDestinationLocationId(UUID.randomUUID());
        request.setStatus(TransportRequestService.PENDING);
        return request;
    }
}
