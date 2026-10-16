package com.equiflow.service;

import com.equiflow.dto.IncidentDto;
import com.equiflow.entity.Incident;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.IncidentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class IncidentService {

    // Giá trị status lưu trong DB (không dấu, khớp dữ liệu mẫu 'Dang xu ly')
    public static final String OPEN = "Dang xu ly";
    public static final String RESOLVED = "Da xu ly";

    private static final Map<String, String> STATUS_ALIASES = Map.of(
            "dang xu ly", OPEN, "open", OPEN, "da xu ly", RESOLVED, "resolved", RESOLVED);
    private static final String STATUS_HINT = "OPEN, RESOLVED";

    /** Chỉ báo sự cố khi chuyến đã sẵn sàng hoặc đang thực hiện. */
    private static final Set<String> REPORTABLE = Set.of(TransportPlanService.READY, TransportPlanService.IN_PROGRESS);

    private static final String CREW_ROLE = "DRIVER_ESCORT";
    private static final String MANAGER_ROLE = "LOGISTICS_MANAGER";

    private final IncidentRepository incidentRepository;
    private final TransportPlanRepository planRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;

    public IncidentService(IncidentRepository incidentRepository, TransportPlanRepository planRepository,
                           UserRepository userRepository, RequestAccessService access) {
        this.incidentRepository = incidentRepository;
        this.planRepository = planRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    /** Tài xế / người đi kèm được phân công báo cáo sự cố. */
    @Transactional
    public IncidentDto.Response create(IncidentDto.Request req, UUID reporterId) {
        TransportPlan plan = planOrThrow(req.planId());
        if (incidentRepository.countCrewAssignments(plan.getPlanId(), reporterId) == 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không được phân công cho kế hoạch vận chuyển này");
        }
        if (!REPORTABLE.contains(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ báo sự cố khi kế hoạch ở trạng thái sẵn sàng hoặc đang thực hiện (hiện tại: "
                            + plan.getStatus() + ")");
        }
        if ((req.latitude() == null) != (req.longitude() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập cả vĩ độ và kinh độ, hoặc bỏ trống cả hai");
        }
        Incident i = new Incident();
        i.setPlanId(plan.getPlanId());
        i.setCategory(req.category().trim());
        i.setDescription(req.description().trim());
        i.setSos(Boolean.TRUE.equals(req.sos()));
        i.setLatitude(scale6(req.latitude()));
        i.setLongitude(scale6(req.longitude()));
        i.setStatus(OPEN);
        i.setAdditionalCost(scale2(req.additionalCost()));
        i = incidentRepository.save(i);

        notifyManagers(i, plan, i.isSos());
        return toResponse(i);
    }

    /** Customer chỉ thấy sự cố thuộc kế hoạch của yêu cầu của mình; nhân viên thấy tất cả. */
    @Transactional(readOnly = true)
    public List<IncidentDto.Response> findAll(UUID currentUserId, boolean customer, String status, Boolean sos) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        List<Incident> list;
        if (customer) {
            Set<UUID> requestIds = access.requestIdsOf(currentUserId);
            if (requestIds.isEmpty()) return List.of();
            Set<UUID> planIds = planRepository.findByRequestIdInOrderByDepartureTimeDesc(requestIds).stream()
                    .map(TransportPlan::getPlanId).collect(Collectors.toSet());
            if (planIds.isEmpty()) return List.of();
            list = incidentRepository.findByPlanIdInOrderByReportedAtDesc(planIds);
        } else {
            list = incidentRepository.findAllByOrderByReportedAtDesc();
        }
        return toResponses(list.stream()
                .filter(i -> st == null || st.equals(i.getStatus()))
                .filter(i -> sos == null || sos == i.isSos())
                .toList());
    }

    @Transactional(readOnly = true)
    public IncidentDto.Response findById(UUID id, UUID currentUserId, boolean customer) {
        Incident i = getOrThrow(id);
        if (customer) access.assertCustomerOwns(planOrThrow(i.getPlanId()).getRequestId(), currentUserId);
        return toResponse(i);
    }

    @Transactional(readOnly = true)
    public List<IncidentDto.Response> findByPlan(UUID planId, UUID currentUserId, boolean customer) {
        TransportPlan plan = planOrThrow(planId);
        if (customer) access.assertCustomerOwns(plan.getRequestId(), currentUserId);
        return toResponses(incidentRepository.findByPlanIdOrderByReportedAtDesc(planId));
    }

    @Transactional
    public IncidentDto.Response update(UUID id, IncidentDto.UpdateRequest req, UUID userId) {
        Incident i = getOrThrow(id);
        assertCanModify(i, userId);
        assertOpen(i);
        if (req.category() == null && req.description() == null && req.sos() == null
                && req.latitude() == null && req.longitude() == null && req.additionalCost() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không có thông tin nào để cập nhật");
        }
        if (req.category() != null) {
            String c = blankToNull(req.category());
            if (c == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Loại sự cố không được để trống");
            i.setCategory(c);
        }
        if (req.description() != null) {
            String d = blankToNull(req.description());
            if (d == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Mô tả sự cố không được để trống");
            i.setDescription(d);
        }
        if (req.latitude() != null) i.setLatitude(scale6(req.latitude()));
        if (req.longitude() != null) i.setLongitude(scale6(req.longitude()));
        if ((i.getLatitude() == null) != (i.getLongitude() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập cả vĩ độ và kinh độ");
        }
        if (req.additionalCost() != null) {
            BigDecimal cost = scale2(req.additionalCost());
            // đổi số tiền sau khi đã duyệt -> phải duyệt lại
            if (i.getCostApprovedBy() != null
                    && (i.getAdditionalCost() == null || i.getAdditionalCost().compareTo(cost) != 0)) {
                i.setCostApprovedBy(null);
            }
            i.setAdditionalCost(cost);
        }
        boolean becameSos = req.sos() != null && req.sos() && !i.isSos();
        if (req.sos() != null) i.setSos(req.sos());
        i = incidentRepository.saveAndFlush(i);

        if (becameSos) notifyManagers(i, planOrThrow(i.getPlanId()), true);
        return toResponse(i);
    }

    @Transactional
    public IncidentDto.Response resolve(UUID id, UUID userId) {
        Incident i = getOrThrow(id);
        assertCanModify(i, userId);
        assertOpen(i);
        i.setStatus(RESOLVED);
        return toResponse(incidentRepository.save(i));
    }

    /** Logistics Manager / Admin duyệt chi phí phát sinh của sự cố. */
    @Transactional
    public IncidentDto.Response approveCost(UUID id, UUID approverId) {
        Incident i = getOrThrow(id);
        if (i.getAdditionalCost() == null || i.getAdditionalCost().signum() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Sự cố này không có chi phí phát sinh cần duyệt");
        }
        if (i.getCostApprovedBy() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Chi phí phát sinh đã được duyệt");
        }
        i.setCostApprovedBy(approverId);
        i = incidentRepository.save(i);

        TransportPlan plan = planOrThrow(i.getPlanId());
        if (plan.getCoordinatorId() != null && !plan.getCoordinatorId().equals(approverId)) {
            access.notify(plan.getCoordinatorId(), "PLAN_UPDATE", "Chi phí sự cố đã được duyệt",
                    "Chi phí phát sinh " + i.getAdditionalCost().toPlainString() + " của sự cố \"" + i.getCategory()
                            + "\" (kế hoạch " + plan.getPlanId() + ") đã được phê duyệt.",
                    "incidents", i.getIncidentId());
        }
        return toResponse(i);
    }

    // ================= helpers =================
    /** Tài xế/người đi kèm chỉ thao tác sự cố của chuyến mình; vai trò quản lý/điều phối thao tác mọi chuyến. */
    private void assertCanModify(Incident i, UUID userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Tài khoản không hợp lệ"));
        if (CREW_ROLE.equals(u.getRoleId()) && incidentRepository.countCrewAssignments(i.getPlanId(), userId) == 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không được phân công cho kế hoạch vận chuyển này");
        }
    }

    private static void assertOpen(Incident i) {
        if (RESOLVED.equals(i.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Sự cố đã được xử lý");
        }
    }

    /** Báo cho các Logistics Manager và điều phối viên của kế hoạch. Loại thông báo phải nằm trong CHECK của DB. */
    private void notifyManagers(Incident i, TransportPlan plan, boolean sos) {
        Set<UUID> recipients = new LinkedHashSet<>();
        userRepository.findByRoleId(MANAGER_ROLE).forEach(u -> recipients.add(u.getUserId()));
        if (plan.getCoordinatorId() != null) recipients.add(plan.getCoordinatorId());

        String title = sos ? "SOS: sự cố khẩn cấp trên chuyến vận chuyển" : "Có sự cố mới trên chuyến vận chuyển";
        StringBuilder msg = new StringBuilder("Sự cố \"").append(i.getCategory())
                .append("\" tại kế hoạch ").append(plan.getPlanId()).append(".");
        if (i.getAdditionalCost() != null && i.getAdditionalCost().signum() > 0) {
            msg.append(" Chi phí phát sinh ").append(i.getAdditionalCost().toPlainString()).append(" cần phê duyệt.");
        }
        for (UUID r : recipients) {
            access.notify(r, sos ? "INCIDENT_SOS" : "PLAN_UPDATE", title, msg.toString(),
                    "incidents", i.getIncidentId());
        }
    }

    private static BigDecimal scale6(BigDecimal v) {
        return v == null ? null : v.setScale(6, RoundingMode.HALF_UP);
    }

    private static BigDecimal scale2(BigDecimal v) {
        return v == null ? null : v.setScale(2, RoundingMode.HALF_UP);
    }

    private TransportPlan planOrThrow(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private Incident getOrThrow(UUID id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy sự cố"));
    }

    private IncidentDto.Response toResponse(Incident i) {
        return toResponses(List.of(i)).get(0);
    }

    private List<IncidentDto.Response> toResponses(List<Incident> list) {
        Set<UUID> approverIds = list.stream().map(Incident::getCostApprovedBy).filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, User> users = userRepository.findAllById(approverIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        return list.stream().map(i -> {
            User approver = i.getCostApprovedBy() == null ? null : users.get(i.getCostApprovedBy());
            return new IncidentDto.Response(i.getIncidentId(), i.getPlanId(), i.getCategory(), i.getDescription(),
                    i.isSos(), i.getLatitude(), i.getLongitude(), i.getStatus(), i.getAdditionalCost(),
                    i.getCostApprovedBy() != null, i.getCostApprovedBy(),
                    approver == null ? null : approver.getName(), i.getReportedAt());
        }).toList();
    }
}
