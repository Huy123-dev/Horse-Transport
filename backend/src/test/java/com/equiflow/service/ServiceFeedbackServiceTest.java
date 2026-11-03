package com.equiflow.service;

import com.equiflow.dto.ServiceFeedbackDto;
import com.equiflow.entity.ServiceFeedback;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.ServiceFeedbackRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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

class ServiceFeedbackServiceTest {

    private final ServiceFeedbackRepository feedbackRepository = mock(ServiceFeedbackRepository.class);
    private final TransportRequestRepository requestRepository = mock(TransportRequestRepository.class);
    private final TransportPlanRepository planRepository = mock(TransportPlanRepository.class);
    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final RequestAccessService requestAccess = mock(RequestAccessService.class);

    private ServiceFeedbackService service;

    @BeforeEach
    void setUp() {
        service = new ServiceFeedbackService(
                feedbackRepository,
                requestRepository,
                planRepository,
                deliveryRepository,
                userRepository,
                requestAccess
        );
    }

    @Test
    void submitOrUpdateFailsWhenTripNotCompleted() {
        UUID requestId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        TransportRequest tr = new TransportRequest();
        tr.setRequestId(requestId);
        tr.setStatus("PENDING");
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(tr));
        when(planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId)).thenReturn(List.of());

        ApiException ex = assertThrows(ApiException.class, () ->
                service.submitOrUpdate(requestId, customerId, new ServiceFeedbackDto.CreateRequest(5, 5, 5, 5, 5, "Tot", null)));

        assertEquals(CONFLICT, ex.getStatus());
    }

    @Test
    void submitOrUpdateSucceedsWhenRequestCompleted() {
        UUID requestId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        TransportRequest tr = new TransportRequest();
        tr.setRequestId(requestId);
        tr.setStatus("COMPLETED");
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(tr));
        when(feedbackRepository.findByRequestId(requestId)).thenReturn(Optional.empty());

        User customer = new User();
        customer.setUserId(customerId);
        customer.setName("Nguyễn Văn An");
        when(userRepository.findById(customerId)).thenReturn(Optional.of(customer));

        when(feedbackRepository.saveAndFlush(any(ServiceFeedback.class))).thenAnswer(i -> {
            ServiceFeedback fb = i.getArgument(0);
            fb.setFeedbackId(UUID.randomUUID());
            return fb;
        });

        ServiceFeedbackDto.CreateRequest req = new ServiceFeedbackDto.CreateRequest(
                5, 4, 5, 5, 4, "Dịch vụ rất tốt, ngựa an toàn", "http://image.url"
        );

        ServiceFeedbackDto.Response res = service.submitOrUpdate(requestId, customerId, req);

        assertNotNull(res);
        assertEquals(5, res.rating());
        assertEquals(4, res.transportQuality());
        assertEquals("Dịch vụ rất tốt, ngựa an toàn", res.comments());
        assertEquals("Nguyễn Văn An", res.customerName());
        verify(feedbackRepository).saveAndFlush(any(ServiceFeedback.class));
    }
}
