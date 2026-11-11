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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceFeedbackService {

    private final ServiceFeedbackRepository feedbackRepository;
    private final TransportRequestRepository requestRepository;
    private final TransportPlanRepository planRepository;
    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final RequestAccessService requestAccess;

    public ServiceFeedbackService(ServiceFeedbackRepository feedbackRepository,
                                  TransportRequestRepository requestRepository,
                                  TransportPlanRepository planRepository,
                                  DeliveryRepository deliveryRepository,
                                  UserRepository userRepository,
                                  RequestAccessService requestAccess) {
        this.feedbackRepository = feedbackRepository;
        this.requestRepository = requestRepository;
        this.planRepository = planRepository;
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.requestAccess = requestAccess;
    }

    @Transactional
    public ServiceFeedbackDto.Response submitOrUpdate(UUID requestId, UUID customerId,
                                                      ServiceFeedbackDto.CreateRequest request) {
        requestAccess.assertCustomerOwns(requestId, customerId);

        TransportRequest tr = requestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu vận chuyển"));

        boolean canFeedback = "COMPLETED".equalsIgnoreCase(tr.getStatus())
                || "DELIVERED".equalsIgnoreCase(tr.getStatus())
                || planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId).stream()
                        .anyMatch(plan -> TransportPlanService.COMPLETED.equals(plan.getStatus())
                                || deliveryRepository.existsByPlanId(plan.getPlanId()));

        if (!canFeedback) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ có thể gửi đánh giá sau khi chuyến vận chuyển đã hoàn thành hoặc có biên bản giao ngựa");
        }

        ServiceFeedback feedback = feedbackRepository.findByRequestId(requestId)
                .orElseGet(() -> {
                    ServiceFeedback fb = new ServiceFeedback();
                    fb.setRequestId(requestId);
                    fb.setCustomerId(customerId);
                    return fb;
                });

        feedback.setRating(request.rating());
        feedback.setTransportQuality(request.transportQuality() != null ? request.transportQuality() : request.rating());
        feedback.setHorseCare(request.horseCare() != null ? request.horseCare() : request.rating());
        feedback.setTrackingUpdates(request.trackingUpdates() != null ? request.trackingUpdates() : request.rating());
        feedback.setPunctuality(request.punctuality() != null ? request.punctuality() : request.rating());
        feedback.setComments(blankToNull(request.comments()));
        feedback.setPhotoUrl(blankToNull(request.photoUrl()));

        feedback = feedbackRepository.saveAndFlush(feedback);

        String customerName = userRepository.findById(customerId).map(User::getName).orElse("Khách hàng");
        String requestCode = "REQ-" + requestId.toString().substring(0, 8).toUpperCase();
        return toResponse(feedback, customerName, requestCode);
    }

    @Transactional(readOnly = true)
    public Optional<ServiceFeedbackDto.Response> findByRequestId(UUID requestId, UUID currentUserId, boolean isCustomer) {
        if (isCustomer) {
            requestAccess.assertCustomerOwns(requestId, currentUserId);
        }
        return feedbackRepository.findByRequestId(requestId).map(this::populateResponse);
    }

    @Transactional(readOnly = true)
    public List<ServiceFeedbackDto.Response> findAll() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::populateResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceFeedbackDto.Response> findMyFeedbacks(UUID customerId) {
        return feedbackRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::populateResponse)
                .toList();
    }

    private ServiceFeedbackDto.Response populateResponse(ServiceFeedback feedback) {
        String customerName = userRepository.findById(feedback.getCustomerId())
                .map(User::getName).orElse("Khách hàng");
        String requestCode = "REQ-" + feedback.getRequestId().toString().substring(0, 8).toUpperCase();
        return toResponse(feedback, customerName, requestCode);
    }

    private static ServiceFeedbackDto.Response toResponse(ServiceFeedback feedback, String customerName, String requestCode) {
        return new ServiceFeedbackDto.Response(
                feedback.getFeedbackId(),
                feedback.getRequestId(),
                feedback.getCustomerId(),
                customerName,
                requestCode,
                feedback.getRating(),
                feedback.getTransportQuality(),
                feedback.getHorseCare(),
                feedback.getTrackingUpdates(),
                feedback.getPunctuality(),
                feedback.getComments(),
                feedback.getPhotoUrl(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt()
        );
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
