package com.equiflow.service;

import com.equiflow.dto.TransportRequestResponse;
import com.equiflow.entity.Location;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.NotificationRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.TransportRequestStallRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.CONFLICT;

class TransportRequestServiceTest {

    private final TransportRequestRepository requestRepository = mock(TransportRequestRepository.class);
    private final HorseRepository horseRepository = mock(HorseRepository.class);
    private final LocationRepository locationRepository = mock(LocationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final TransportRequestStallRepository stallRepository = mock(TransportRequestStallRepository.class);
    private final PricingService pricingService = mock(PricingService.class);

    private TransportRequestService service;

    @BeforeEach
    void setUp() {
        service = new TransportRequestService(
                requestRepository,
                horseRepository,
                locationRepository,
                userRepository,
                notificationRepository,
                stallRepository,
                pricingService
        );
    }

    @Test
    void approveWithEstimatedAmountSucceedsDirectly() {
        UUID requestId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID originId = UUID.randomUUID();
        UUID destId = UUID.randomUUID();

        TransportRequest tr = new TransportRequest();
        tr.setRequestId(requestId);
        tr.setCustomerId(customerId);
        tr.setStatus("Dang tham dinh");
        tr.setOriginLocationId(originId);
        tr.setDestinationLocationId(destId);

        Location loc1 = new Location();
        loc1.setLocationId(originId);
        loc1.setName("Hà Nội");

        Location loc2 = new Location();
        loc2.setLocationId(destId);
        loc2.setName("Hồ Chí Minh");

        when(requestRepository.findByIdForUpdate(requestId)).thenReturn(Optional.of(tr));
        when(requestRepository.saveAndFlush(any(TransportRequest.class))).thenAnswer(i -> i.getArgument(0));
        when(locationRepository.findAllById(any())).thenReturn(List.of(loc1, loc2));

        BigDecimal directAmount = new BigDecimal("4800.00");
        TransportRequestResponse res = service.approve(requestId, managerId, null, directAmount);

        assertNotNull(res);
        assertEquals("Da phe duyet", res.status());
        assertEquals(directAmount, res.estimatedAmount());
        assertEquals("USD", res.currency());
        verify(requestRepository).saveAndFlush(any(TransportRequest.class));
    }

    @Test
    void approveFailsWhenRequestAlreadyApproved() {
        UUID requestId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();

        TransportRequest tr = new TransportRequest();
        tr.setRequestId(requestId);
        tr.setStatus("Da phe duyet");
        when(requestRepository.findByIdForUpdate(requestId)).thenReturn(Optional.of(tr));

        ApiException ex = assertThrows(ApiException.class, () ->
                service.approve(requestId, managerId, null, new BigDecimal("5000.00")));

        assertEquals(CONFLICT, ex.getStatus());
    }

    @Test
    void approveWithoutFingerprintFailsWhenRequestHasPricingSelection() {
        UUID requestId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();

        when(pricingService.hasPricingSelection(requestId)).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () ->
                service.approve(requestId, managerId, null, new BigDecimal("5000.00")));

        assertEquals(CONFLICT, ex.getStatus());
    }
}
