package com.equiflow.service;

import com.equiflow.dto.TransportPlanDto;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.InspectionRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class TransportPlanService {

    // Giá trị status lưu trong DB (không dấu; 'Dang lap ke hoach' và 'Dang thuc hien' lấy từ dữ liệu mẫu)
    public static final String PLANNING = "Dang lap ke hoach";
    public static final String READY = "San sang";
    public static final String IN_PROGRESS = "Dang thuc hien";
    public static final String COMPLETED = "Hoan thanh"; // do Người 3 đặt qua /complete
    public static final String CANCELLED = "Da huy";

    /** Còn được thêm/xóa điểm dừng, sửa kế hoạch. */
    public static final Set<String> EDITABLE = Set.of(PLANNING, READY);
    /** Kế hoạch còn hiệu lực (chiếm dụng phương tiện/nhân sự). */
    public static final Set<String> OPEN = Set.of(PLANNING, READY, IN_PROGRESS);

    private static final Map<String, String> STATUS_ALIASES = Map.ofEntries(
            Map.entry("dang lap ke hoach", PLANNING), Map.entry("planning", PLANNING),
            Map.entry("san sang", READY), Map.entry("ready", READY),
            Map.entry("dang thuc hien", IN_PROGRESS), Map.entry("in progress", IN_PROGRESS),
            Map.entry("hoan thanh", COMPLETED), Map.entry("completed", COMPLETED),
            Map.entry("da huy", CANCELLED), Map.entry("cancelled", CANCELLED), Map.entry("canceled", CANCELLED));
    private static final String STATUS_HINT = "PLANNING, READY, IN_PROGRESS, CANCELLED";

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            PLANNING, Set.of(READY, CANCELLED),
            READY, Set.of(PLANNING, IN_PROGRESS, CANCELLED),
            IN_PROGRESS, Set.of(CANCELLED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of());

    private static final String COORDINATOR_ROLE = "FLEET_COORDINATOR";

    private final TransportPlanRepository planRepository;
    private final TransportAssignmentRepository assignmentRepository;
    private final InspectionRepository inspectionRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;

    public TransportPlanService(TransportPlanRepository planRepository,
                                TransportAssignmentRepository assignmentRepository,
                                InspectionRepository inspectionRepository,
                                UserRepository userRepository,
                                RequestAccessService access) {
        this.planRepository = planRepository;
        this.assignmentRepository = assignmentRepository;
        this.inspectionRepository = inspectionRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    // ================= CREATE =================
    @Transactional
    public TransportPlanDto.Response create(TransportPlanDto.CreateRequest req, UUID currentUserId) {
        checkTimes(req.departureTime(), req.arrivalTime());
        TransportRequest request = access.getApprovedOrThrow(req.requestId());
        if (planRepository.existsByRequestIdAndStatusNot(request.getRequestId(), CANCELLED)) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu này đã có kế hoạch vận chuyển");
        }
        TransportPlan p = new TransportPlan();
        p.setRequestId(request.getRequestId());
        p.setRouteDetails(blankToNull(req.routeDetails()));
        p.setDepartureTime(req.departureTime());
        p.setArrivalTime(req.arrivalTime());
        p.setStatus(PLANNING);
        p.setCoordinatorId(resolveCoordinator(req.coordinatorId(), currentUserId));
        p = planRepository.saveAndFlush(p);
        notifyCustomer(p, "Đã lập kế hoạch vận chuyển", "Yêu cầu của bạn đã có kế hoạch vận chuyển đang được lập.");
        return toResponse(p);
    }

    // ================= READ =================
    @Transactional(readOnly = true)
    public List<TransportPlanDto.Response> findAll(UUID currentUserId, boolean customer, String status) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        List<TransportPlan> list;
        if (customer) {
            Set<UUID> requestIds = access.requestIdsOf(currentUserId);
            list = requestIds.isEmpty() ? List.of() : planRepository.findByRequestIdInOrderByDepartureTimeDesc(requestIds);
        } else {
            list = planRepository.findAllByOrderByDepartureTimeDesc();
        }
        if (st != null) {
            list = list.stream().filter(p -> st.equals(p.getStatus())).toList();
        }
        return toResponses(list);
    }

    @Transactional(readOnly = true)
    public TransportPlanDto.Response findById(UUID id, UUID currentUserId, boolean customer) {
        TransportPlan p = getOrThrow(id);
        if (customer) access.assertCustomerOwns(p.getRequestId(), currentUserId);
        return toResponse(p);
    }

    /** Kế hoạch của một yêu cầu: ưu tiên kế hoạch còn hiệu lực, không có thì lấy kế hoạch đã hủy mới nhất. */
    @Transactional(readOnly = true)
    public TransportPlanDto.Response findByRequest(UUID requestId, UUID currentUserId, boolean customer) {
        access.getOrThrow(requestId);
        if (customer) access.assertCustomerOwns(requestId, currentUserId);
        List<TransportPlan> plans = planRepository.findByRequestIdOrderByDepartureTimeDesc(requestId);
        TransportPlan found = plans.stream()
                .filter(p -> !CANCELLED.equals(p.getStatus()))
                .findFirst()
                .or(() -> plans.stream().findFirst())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Yêu cầu này chưa có kế hoạch vận chuyển"));
        return toResponse(found);
    }

    // ================= UPDATE =================
    @Transactional
    public TransportPlanDto.Response update(UUID id, TransportPlanDto.UpdateRequest req, UUID currentUserId) {
        TransportPlan p = getOrThrow(id);
        if (!EDITABLE.contains(p.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ sửa được kế hoạch đang lập hoặc sẵn sàng (hiện tại: " + p.getStatus() + ")");
        }
        checkTimes(req.departureTime(), req.arrivalTime());
        p.setRouteDetails(blankToNull(req.routeDetails()));
        p.setDepartureTime(req.departureTime());
        p.setArrivalTime(req.arrivalTime());
        if (req.coordinatorId() != null) {
            p.setCoordinatorId(resolveCoordinator(req.coordinatorId(), currentUserId));
        }
        return toResponse(planRepository.save(p));
    }

    // ================= UPDATE STATUS =================
    @Transactional
    public TransportPlanDto.Response updateStatus(UUID id, TransportPlanDto.StatusRequest req) {
        TransportPlan p = getOrThrow(id);
        String target = StatusSupport.normalize(req.status(), STATUS_ALIASES, STATUS_HINT);
        if (COMPLETED.equals(target)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hoàn tất chuyến đi dùng PATCH /api/transport-plans/{id}/complete");
        }
        if (target.equals(p.getStatus())) {
            return toResponse(p);
        }
        if (!TRANSITIONS.getOrDefault(p.getStatus(), Set.of()).contains(target)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể chuyển kế hoạch từ '" + p.getStatus() + "' sang '" + target + "'");
        }
        if (READY.equals(target)) {
            if (inspectionRepository.existsByRequestIdAndStatus(p.getRequestId(), InspectionService.REJECTED)) {
                throw new ApiException(HttpStatus.CONFLICT, "Còn hồ sơ kiểm tra bị từ chối, chưa thể chuyển sang sẵn sàng");
            }
            if (!assignmentRepository.existsByPlanId(p.getPlanId())) {
                throw new ApiException(HttpStatus.CONFLICT, "Cần phân công ít nhất một phương tiện/nhân sự trước khi sẵn sàng");
            }
        }
        if (IN_PROGRESS.equals(target)
                && inspectionRepository.existsByRequestIdAndStatusNot(p.getRequestId(), InspectionService.APPROVED)) {
            throw new ApiException(HttpStatus.CONFLICT, "Tất cả hồ sơ kiểm tra phải được phê duyệt trước khi khởi hành");
        }
        p.setStatus(target);
        p = planRepository.saveAndFlush(p);
        notifyCustomer(p, "Cập nhật kế hoạch vận chuyển", "Kế hoạch vận chuyển của bạn chuyển sang: " + target);
        return toResponse(p);
    }

    // ================= helpers =================
    private TransportPlan getOrThrow(UUID id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private static void checkTimes(LocalDateTime departure, LocalDateTime arrival) {
        if (!arrival.isAfter(departure)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Thời gian đến phải sau thời gian khởi hành");
        }
    }

    /** Điều phối viên chỉ định rõ thì phải đúng vai trò; không chỉ định thì lấy người tạo nếu họ là điều phối viên. */
    private UUID resolveCoordinator(UUID requested, UUID currentUserId) {
        if (requested != null) {
            User u = userRepository.findById(requested)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Điều phối viên không tồn tại"));
            if (!COORDINATOR_ROLE.equals(u.getRoleId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ chọn được tài khoản có vai trò " + COORDINATOR_ROLE);
            }
            return u.getUserId();
        }
        return userRepository.findById(currentUserId)
                .filter(u -> COORDINATOR_ROLE.equals(u.getRoleId()))
                .map(User::getUserId)
                .orElse(null);
    }

    private void notifyCustomer(TransportPlan p, String title, String message) {
        UUID customerId = access.getOrThrow(p.getRequestId()).getCustomerId();
        access.notify(customerId, "PLAN_UPDATE", title, message, "transport_plans", p.getPlanId());
    }

    private TransportPlanDto.Response toResponse(TransportPlan p) {
        return toResponses(List.of(p)).get(0);
    }

    private List<TransportPlanDto.Response> toResponses(List<TransportPlan> list) {
        Set<UUID> ids = list.stream().map(TransportPlan::getCoordinatorId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, User> users = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        return list.stream().map(p -> {
            User c = p.getCoordinatorId() == null ? null : users.get(p.getCoordinatorId());
            return new TransportPlanDto.Response(p.getPlanId(), p.getRequestId(), p.getRouteDetails(),
                    p.getDepartureTime(), p.getArrivalTime(), p.getStatus(), p.getCoordinatorId(),
                    c == null ? null : c.getName());
        }).toList();
    }
}
