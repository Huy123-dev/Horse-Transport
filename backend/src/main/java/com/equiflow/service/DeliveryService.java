package com.equiflow.service;

import com.equiflow.dto.DeliveryDto;
import com.equiflow.dto.TransportPlanDto;
import com.equiflow.entity.Delivery;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.IncidentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import com.equiflow.security.CrewRoles;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class DeliveryService {


    private final DeliveryRepository deliveryRepository;
    private final TransportPlanRepository planRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final TransportPlanService planService;
    private final RequestAccessService access;
    private final CrewAssignmentAccessService crewAccess;

    public DeliveryService(DeliveryRepository deliveryRepository, TransportPlanRepository planRepository,
                           IncidentRepository incidentRepository, UserRepository userRepository,
                           TransportPlanService planService, RequestAccessService access,
                           CrewAssignmentAccessService crewAccess) {
        this.deliveryRepository = deliveryRepository;
        this.planRepository = planRepository;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.planService = planService;
        this.access = access;
        this.crewAccess = crewAccess;
    }

    /** Tài xế / người đi kèm được phân công ghi nhận bàn giao khi chuyến đang thực hiện. */
    @Transactional
    public DeliveryDto.Response create(DeliveryDto.CreateRequest req, UUID reporterId) {
        TransportPlan plan = planOrThrow(req.planId());
        if (!crewAccess.isAssigned(plan.getPlanId(), reporterId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không được phân công cho kế hoạch vận chuyển này");
        }
        if (!TransportPlanService.IN_PROGRESS.equals(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ ghi nhận bàn giao khi chuyến đang thực hiện (hiện tại: " + plan.getStatus() + ")");
        }
        if (deliveryRepository.existsByPlanId(plan.getPlanId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Chuyến này đã được ghi nhận bàn giao");
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (req.deliveredAt() != null && req.deliveredAt().isAfter(now.plusMinutes(5))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Thời điểm bàn giao không được ở tương lai");
        }

        Delivery d = new Delivery();
        d.setPlanId(plan.getPlanId());
        d.setRecipientName(req.recipientName().trim());
        d.setSignatureImageUrl(req.signatureImageUrl().trim());
        d.setPodDocumentUrl(blankToNull(req.podDocumentUrl()));
        d.setDeliveredAt(req.deliveredAt() != null ? req.deliveredAt() : now);
        d = deliveryRepository.saveAndFlush(d);

        notifyCustomer(plan, "Đã bàn giao ngựa",
                "Ngựa của bạn đã được bàn giao cho " + d.getRecipientName() + ".");
        return toResponse(d);
    }

    @Transactional(readOnly = true)
    public DeliveryDto.Response findById(UUID id, UUID currentUserId, boolean customer, boolean driverEscort) {
        Delivery d = deliveryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        driverEscort ? "Không tìm thấy kế hoạch vận chuyển" : "Không tìm thấy biên bản bàn giao"));
        assertCanRead(planOrThrow(d.getPlanId()), currentUserId, customer, driverEscort);
        return toResponse(d);
    }

    @Transactional(readOnly = true)
    public DeliveryDto.Response findByPlan(UUID planId, UUID currentUserId, boolean customer, boolean driverEscort) {
        TransportPlan plan = planOrThrow(planId);
        assertCanRead(plan, currentUserId, customer, driverEscort);
        Delivery d = deliveryRepository.findFirstByPlanIdOrderByDeliveredAtDesc(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Chuyến này chưa có biên bản bàn giao"));
        return toResponse(d);
    }

    /**
     * Hoàn tất chuyến: chuyến phải đang thực hiện, đã có biên bản bàn giao và không còn sự cố chưa xử lý.
     * Tài xế/người đi kèm chỉ hoàn tất được chuyến mình được phân công.
     */
    @Transactional
    public TransportPlanDto.Response complete(UUID planId, UUID currentUserId) {
        TransportPlan plan = planOrThrow(planId);
        assertCanComplete(plan, currentUserId);

        if (TransportPlanService.COMPLETED.equals(plan.getStatus())) {
            return planService.findById(planId, currentUserId, false);
        }
        if (!TransportPlanService.IN_PROGRESS.equals(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ hoàn tất được chuyến đang thực hiện (hiện tại: " + plan.getStatus() + ")");
        }
        if (!deliveryRepository.existsByPlanId(planId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Cần ghi nhận bàn giao trước khi hoàn tất chuyến");
        }
        boolean hasOpenIncident = incidentRepository.findByPlanIdOrderByReportedAtDesc(planId).stream()
                .anyMatch(i -> IncidentService.OPEN.equals(i.getStatus()));
        if (hasOpenIncident) {
            throw new ApiException(HttpStatus.CONFLICT, "Còn sự cố chưa được xử lý, chưa thể hoàn tất chuyến");
        }

        plan.setStatus(TransportPlanService.COMPLETED);
        planRepository.saveAndFlush(plan);
        notifyCustomer(plan, "Chuyến vận chuyển đã hoàn tất",
                "Chuyến vận chuyển của bạn đã hoàn tất và được nghiệm thu.");
        return planService.findById(planId, currentUserId, false);
    }

    private void assertCanComplete(TransportPlan plan, UUID userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Tài khoản không hợp lệ"));
        if (CrewRoles.isCrewRole(u.getRoleId()) && !crewAccess.isAssigned(plan.getPlanId(), userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không được phân công cho kế hoạch vận chuyển này");
        }
    }

    private void assertCustomerOwnsPlan(TransportPlan plan, UUID customerId) {
        access.assertCustomerOwns(plan.getRequestId(), customerId);
    }

    private void assertCanRead(TransportPlan plan, UUID userId, boolean customer, boolean driverEscort) {
        if (customer) assertCustomerOwnsPlan(plan, userId);
        if (driverEscort) crewAccess.assertAssigned(plan.getPlanId(), userId);
    }

    private TransportPlan planOrThrow(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private void notifyCustomer(TransportPlan plan, String title, String message) {
        UUID customerId = access.getOrThrow(plan.getRequestId()).getCustomerId();
        access.notify(customerId, "PLAN_UPDATE", title, message, "transport_plans", plan.getPlanId());
    }

    private DeliveryDto.Response toResponse(Delivery d) {
        return new DeliveryDto.Response(d.getDeliveryId(), d.getPlanId(), d.getRecipientName(),
                d.getSignatureImageUrl(), d.getDeliveredAt(), d.getPodDocumentUrl());
    }
}
