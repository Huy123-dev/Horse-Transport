package com.equiflow.service;

import com.equiflow.dto.AssignmentDto;
import com.equiflow.dto.MessageResponse;
import com.equiflow.entity.TransportAsset;
import com.equiflow.entity.TransportAssignment;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.TransportAssetRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AssignmentService {

    private static final String CREW_ROLE = "DRIVER_ESCORT";
    private static final UUID NONE = new UUID(0L, 0L); // "không loại trừ bản ghi nào"

    private final TransportAssignmentRepository assignmentRepository;
    private final TransportPlanRepository planRepository;
    private final TransportAssetRepository assetRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;

    public AssignmentService(TransportAssignmentRepository assignmentRepository, TransportPlanRepository planRepository,
                             TransportAssetRepository assetRepository, UserRepository userRepository,
                             RequestAccessService access) {
        this.assignmentRepository = assignmentRepository;
        this.planRepository = planRepository;
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    @Transactional
    public AssignmentDto.Response create(UUID planId, AssignmentDto.Request req) {
        TransportPlan plan = planOrThrow(planId);
        assertOpen(plan);
        validate(plan, req, NONE);

        TransportAssignment a = new TransportAssignment();
        a.setPlanId(planId);
        apply(a, req);
        a = assignmentRepository.saveAndFlush(a);

        notifyCrew(a.getDriverUserId(), "tài xế", planId, a.getAssignmentId());
        notifyCrew(a.getAttendantUserId(), "người đi kèm", planId, a.getAssignmentId());
        return toResponse(a);
    }

    @Transactional(readOnly = true)
    public List<AssignmentDto.Response> findByPlan(UUID planId) {
        planOrThrow(planId);
        return toResponses(assignmentRepository.findByPlanIdOrderByAssignedAtAsc(planId));
    }

    @Transactional
    public AssignmentDto.Response update(UUID id, AssignmentDto.Request req) {
        TransportAssignment a = getOrThrow(id);
        TransportPlan plan = planOrThrow(a.getPlanId());
        assertOpen(plan);
        validate(plan, req, id);

        UUID oldDriver = a.getDriverUserId();
        UUID oldAttendant = a.getAttendantUserId();
        apply(a, req);
        a = assignmentRepository.saveAndFlush(a);
        // chỉ báo cho người mới được thêm vào
        if (a.getDriverUserId() != null && !a.getDriverUserId().equals(oldDriver)) {
            notifyCrew(a.getDriverUserId(), "tài xế", plan.getPlanId(), a.getAssignmentId());
        }
        if (a.getAttendantUserId() != null && !a.getAttendantUserId().equals(oldAttendant)) {
            notifyCrew(a.getAttendantUserId(), "người đi kèm", plan.getPlanId(), a.getAssignmentId());
        }
        return toResponse(a);
    }

    @Transactional
    public MessageResponse delete(UUID id) {
        TransportAssignment a = getOrThrow(id);
        TransportPlan plan = planOrThrow(a.getPlanId());
        if (TransportPlanService.COMPLETED.equals(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Chuyến đã hoàn tất, không thể hủy phân công");
        }
        assignmentRepository.delete(a);
        return new MessageResponse("Đã hủy phân công");
    }

    // ================= helpers =================
    /** Kiểm tra dữ liệu và xung đột lịch (selfId = bản ghi đang sửa, NONE khi tạo mới). */
    private void validate(TransportPlan plan, AssignmentDto.Request req, UUID selfId) {
        if (req.assetId() == null && req.driverUserId() == null && req.attendantUserId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cần chọn ít nhất phương tiện, tài xế hoặc người đi kèm");
        }
        if (req.driverUserId() != null && req.driverUserId().equals(req.attendantUserId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tài xế và người đi kèm phải là hai người khác nhau");
        }

        if (req.assetId() != null) {
            TransportAsset asset = assetRepository.findById(req.assetId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Phương tiện không tồn tại"));
            if (TransportAssetService.MAINTENANCE.equals(asset.getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "Phương tiện đang bảo trì, không thể phân công");
            }
            if (assignmentRepository.existsByPlanIdAndAssetIdAndAssignmentIdNot(plan.getPlanId(), asset.getAssetId(), selfId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Phương tiện này đã được phân cho kế hoạch");
            }
            if (assignmentRepository.countAssetConflicts(asset.getAssetId(), plan.getPlanId(), TransportPlanService.OPEN,
                    plan.getDepartureTime(), plan.getArrivalTime()) > 0) {
                throw new ApiException(HttpStatus.CONFLICT, "Phương tiện đã được phân cho kế hoạch khác trùng thời gian");
            }
        }
        checkCrew(req.driverUserId(), "Tài xế", plan);
        checkCrew(req.attendantUserId(), "Người đi kèm", plan);
    }

    private void checkCrew(UUID userId, String label, TransportPlan plan) {
        if (userId == null) return;
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, label + " không tồn tại"));
        if (!CREW_ROLE.equals(user.getRoleId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, label + " phải là tài khoản có vai trò " + CREW_ROLE);
        }
        if (assignmentRepository.countUserConflicts(userId, plan.getPlanId(), TransportPlanService.OPEN,
                plan.getDepartureTime(), plan.getArrivalTime()) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, label + " (" + user.getName() + ") đã có chuyến khác trùng thời gian");
        }
    }

    private static void apply(TransportAssignment a, AssignmentDto.Request req) {
        a.setAssetId(req.assetId());
        a.setDriverUserId(req.driverUserId());
        a.setAttendantUserId(req.attendantUserId());
    }

    private void notifyCrew(UUID userId, String roleLabel, UUID planId, UUID assignmentId) {
        if (userId == null) return;
        access.notify(userId, "ASSIGNMENT", "Phân công chuyến vận chuyển",
                "Bạn được phân công làm " + roleLabel + " cho kế hoạch " + planId + ".",
                "transport_assignments", assignmentId);
    }

    private static void assertOpen(TransportPlan plan) {
        if (!TransportPlanService.OPEN.contains(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể thay đổi phân công khi kế hoạch ở trạng thái: " + plan.getStatus());
        }
    }

    private TransportPlan planOrThrow(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private TransportAssignment getOrThrow(UUID id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phân công"));
    }

    private AssignmentDto.Response toResponse(TransportAssignment a) {
        return toResponses(List.of(a)).get(0);
    }

    private List<AssignmentDto.Response> toResponses(List<TransportAssignment> list) {
        Set<UUID> assetIds = list.stream().map(TransportAssignment::getAssetId).filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<UUID> userIds = new LinkedHashSet<>();
        for (TransportAssignment a : list) {
            if (a.getDriverUserId() != null) userIds.add(a.getDriverUserId());
            if (a.getAttendantUserId() != null) userIds.add(a.getAttendantUserId());
        }
        Map<UUID, TransportAsset> assets = assetRepository.findAllById(assetIds).stream()
                .collect(Collectors.toMap(TransportAsset::getAssetId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        return list.stream().map(a -> {
            TransportAsset asset = a.getAssetId() == null ? null : assets.get(a.getAssetId());
            User driver = a.getDriverUserId() == null ? null : users.get(a.getDriverUserId());
            User attendant = a.getAttendantUserId() == null ? null : users.get(a.getAttendantUserId());
            return new AssignmentDto.Response(a.getAssignmentId(), a.getPlanId(),
                    a.getAssetId(), asset == null ? null : asset.getName(), asset == null ? null : asset.getType(),
                    a.getDriverUserId(), driver == null ? null : driver.getName(),
                    a.getAttendantUserId(), attendant == null ? null : attendant.getName(),
                    a.getAssignedAt());
        }).toList();
    }
}
