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
import com.equiflow.security.CrewRoles;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    private static final long MAX_ESCORTS_PER_PLAN = 4;
    private static final UUID NONE = new UUID(0L, 0L); // "không loại trừ bản ghi nào"
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("dd/MM HH:mm");

    private final TransportAssignmentRepository assignmentRepository;
    private final TransportPlanRepository planRepository;
    private final TransportAssetRepository assetRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;

    public AssignmentService(TransportAssignmentRepository assignmentRepository,
                             TransportPlanRepository planRepository,
                             TransportAssetRepository assetRepository,
                             UserRepository userRepository,
                             RequestAccessService access) {
        this.assignmentRepository = assignmentRepository;
        this.planRepository = planRepository;
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    @Transactional
    public AssignmentDto.Response create(UUID planId, AssignmentDto.Request req) {
        TransportPlan plan = lockPlanOrThrow(planId);
        assertOpen(plan);
        validatePlanTimes(plan);

        // Khóa bi quan các tài nguyên liên quan để chống race condition khi nhiều người dùng thao tác đồng thời
        lockResources(req);

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

    @Transactional(readOnly = true)
    public AssignmentDto.OptionsResponse options(UUID planId) {
        TransportPlan plan = planOrThrow(planId);
        LocalDateTime start = plan.getDepartureTime();
        LocalDateTime end = plan.getArrivalTime();

        List<AssignmentDto.Option> assets = assetRepository.findAllByOrderByNameAsc().stream()
                .map(asset -> checkAssetAvailability(asset, planId, start, end))
                .toList();

        List<User> crewUsers = userRepository.findByRoleIdInAndActiveTrue(
                List.copyOf(CrewRoles.allRoleIds()));

        List<AssignmentDto.Option> crew = crewUsers.stream()
                .map(user -> checkUserAvailability(user, planId, start, end, null))
                .toList();

        List<AssignmentDto.Option> drivers = crewUsers.stream()
                .filter(AssignmentService::canBeAssignedAsDriver)
                .map(user -> checkUserAvailability(user, planId, start, end, "Tài xế"))
                .toList();

        List<AssignmentDto.Option> attendants = crewUsers.stream()
                .filter(AssignmentService::canBeAssignedAsEscort)
                .map(user -> checkUserAvailability(user, planId, start, end, "Nhân viên đi kèm"))
                .toList();

        return new AssignmentDto.OptionsResponse(assets, crew, drivers, attendants);
    }

    @Transactional
    public AssignmentDto.Response update(UUID id, AssignmentDto.Request req) {
        TransportAssignment a = getOrThrow(id);
        TransportPlan plan = lockPlanOrThrow(a.getPlanId());
        assertOpen(plan);
        validatePlanTimes(plan);

        // Khóa bi quan các tài nguyên mới để chống race condition
        lockResources(req);

        validate(plan, req, id);

        UUID oldDriver = a.getDriverUserId();
        UUID oldAttendant = a.getAttendantUserId();
        apply(a, req);
        a = assignmentRepository.saveAndFlush(a);
        if (oldDriver != null && !oldDriver.equals(a.getDriverUserId())) {
            access.notify(oldDriver, "ASSIGNMENT", "Thay đổi phân công",
                    "Bạn đã được thay đổi phân công tài xế cho kế hoạch " + formatPlanCode(plan.getPlanId()) + ".",
                    "transport_plans", plan.getPlanId());
        }
        if (a.getDriverUserId() != null && !a.getDriverUserId().equals(oldDriver)) {
            notifyCrew(a.getDriverUserId(), "tài xế", plan.getPlanId(), a.getAssignmentId());
        }
        if (oldAttendant != null && !oldAttendant.equals(a.getAttendantUserId())) {
            access.notify(oldAttendant, "ASSIGNMENT", "Thay đổi phân công",
                    "Bạn đã được thay đổi phân công người đi kèm cho kế hoạch " + formatPlanCode(plan.getPlanId()) + ".",
                    "transport_plans", plan.getPlanId());
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
        UUID oldDriver = a.getDriverUserId();
        UUID oldAttendant = a.getAttendantUserId();
        UUID planId = a.getPlanId();
        assignmentRepository.delete(a);
        if (oldDriver != null) {
            access.notify(oldDriver, "ASSIGNMENT", "Hủy phân công",
                    "Phân công tài xế của bạn cho kế hoạch " + formatPlanCode(planId) + " đã bị hủy.",
                    "transport_plans", planId);
        }
        if (oldAttendant != null) {
            access.notify(oldAttendant, "ASSIGNMENT", "Hủy phân công",
                    "Phân công người đi kèm của bạn cho kế hoạch " + formatPlanCode(planId) + " đã bị hủy.",
                    "transport_plans", planId);
        }
        return new MessageResponse("Đã hủy phân công");
    }

    private void lockResources(AssignmentDto.Request req) {
        if (req.assetId() != null) {
            assetRepository.findByIdForUpdate(req.assetId());
        }
        if (req.driverUserId() != null) {
            userRepository.findByIdForUpdate(req.driverUserId());
        }
        if (req.attendantUserId() != null) {
            userRepository.findByIdForUpdate(req.attendantUserId());
        }
    }

    private void validatePlanTimes(TransportPlan plan) {
        if (plan.getDepartureTime() == null || plan.getArrivalTime() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Kế hoạch vận chuyển chưa có đầy đủ thời gian bắt đầu và kết thúc.");
        }
        if (!plan.getDepartureTime().isBefore(plan.getArrivalTime())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");
        }
    }

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

            if (TransportAssetService.MAINTENANCE.equalsIgnoreCase(asset.getStatus()) || "Bao tri".equalsIgnoreCase(asset.getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "Phương tiện " + asset.getName() + " đang trong thời gian bảo trì, không thể phân công.");
            }

            if (assignmentRepository.existsByPlanIdAndAssetIdAndAssignmentIdNot(plan.getPlanId(), asset.getAssetId(), selfId)) {
                throw new ApiException(HttpStatus.CONFLICT, "Phương tiện " + asset.getName() + " đã được phân cho kế hoạch này");
            }

            List<TransportAssignment> assetConflicts = assignmentRepository.findAssetConflicts(
                    asset.getAssetId(), plan.getPlanId(), selfId, TransportPlanService.OPEN,
                    plan.getDepartureTime(), plan.getArrivalTime());

            if (!assetConflicts.isEmpty()) {
                TransportPlan confPlan = planRepository.findById(assetConflicts.get(0).getPlanId()).orElse(null);
                String confCode = confPlan != null ? formatPlanCode(confPlan.getPlanId()) : "khác";
                String confTime = confPlan != null ? formatTimeWindow(confPlan.getDepartureTime(), confPlan.getArrivalTime()) : "";
                throw new ApiException(HttpStatus.CONFLICT,
                        "Phương tiện " + asset.getName() + " đang được sử dụng trong chuyến " + confCode + (confTime.isEmpty() ? "." : " (" + confTime + ")."));
            }
        }

        checkCrew(req.driverUserId(), "Tài xế", plan, selfId, CrewRoles::canBeDriver);
        checkCrew(req.attendantUserId(), "Người đi kèm", plan, selfId, CrewRoles::canBeEscort);

        if (req.attendantUserId() != null
                && assignmentRepository.countDistinctAttendantsByPlanIdAndAssignmentIdNot(plan.getPlanId(), selfId)
                >= MAX_ESCORTS_PER_PLAN
                && !assignmentRepository.existsByPlanIdAndAssignmentIdNotAndAttendantUserId(
                        plan.getPlanId(), selfId, req.attendantUserId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Mỗi kế hoạch chỉ được phân công tối đa 4 nhân viên đi kèm");
        }
    }

    private void checkCrew(UUID userId, String label, TransportPlan plan, UUID selfId,
                           java.util.function.Predicate<String> roleAllowed) {
        if (userId == null) return;
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, label + " không tồn tại"));
        if (!user.isActive()) {
            throw new ApiException(HttpStatus.CONFLICT, label + " (" + user.getName() + ") đã bị vô hiệu hóa");
        }
        if (!roleAllowed.test(user.getRoleId())) {
            String requiredRole = "Tài xế".equals(label) ? "DRIVER" : "ESCORT";
            throw new ApiException(HttpStatus.BAD_REQUEST, label + " phải là tài khoản có vai trò " + requiredRole);
        }
        String staffType = AuthService.resolveStaffType(user);
        if ("Tài xế".equals(label) && "ESCORT".equals(staffType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    label + " (" + user.getName() + ") là Nhân viên đi kèm (ESCORT), không thể phân công làm Tài xế");
        }
        if ("Người đi kèm".equals(label) && "DRIVER".equals(staffType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    label + " (" + user.getName() + ") là Tài xế (DRIVER), không thể phân công làm Người đi kèm");
        }

        // Kiểm tra trùng trong cùng một kế hoạch
        if ("Tài xế".equals(label) && assignmentRepository.existsByPlanIdAndAssignmentIdNotAndDriverUserId(plan.getPlanId(), selfId, userId)) {
            throw new ApiException(HttpStatus.CONFLICT, label + " " + user.getName() + " đã được phân công cho kế hoạch này");
        }
        if ("Người đi kèm".equals(label) && assignmentRepository.existsByPlanIdAndAssignmentIdNotAndAttendantUserId(plan.getPlanId(), selfId, userId)) {
            throw new ApiException(HttpStatus.CONFLICT, label + " " + user.getName() + " đã được phân công cho kế hoạch này");
        }

        // Kiểm tra trùng lịch với các kế hoạch khác
        List<TransportAssignment> userConflicts = assignmentRepository.findUserConflicts(
                userId, plan.getPlanId(), selfId, TransportPlanService.OPEN,
                plan.getDepartureTime(), plan.getArrivalTime());

        if (!userConflicts.isEmpty()) {
            TransportPlan confPlan = planRepository.findById(userConflicts.get(0).getPlanId()).orElse(null);
            String confCode = confPlan != null ? formatPlanCode(confPlan.getPlanId()) : "khác";
            String confTime = confPlan != null ? formatTimeWindow(confPlan.getDepartureTime(), confPlan.getArrivalTime()) : "";
            throw new ApiException(HttpStatus.CONFLICT,
                    label + " " + user.getName() + " đã được phân công cho chuyến " + confCode +
                            (confTime.isEmpty() ? " trong khoảng thời gian này." : " (" + confTime + ")."));
        }
    }

    private AssignmentDto.Option checkAssetAvailability(TransportAsset asset, UUID currentPlanId,
                                                         LocalDateTime start, LocalDateTime end) {
        String label = asset.getName() + " (" + asset.getType() + ")";
        if (TransportAssetService.MAINTENANCE.equalsIgnoreCase(asset.getStatus()) || "Bao tri".equalsIgnoreCase(asset.getStatus())) {
            return new AssignmentDto.Option(asset.getAssetId(), label, asset.getStatus(), false, "MAINTENANCE", "Đang bảo trì");
        }

        if (start != null && end != null) {
            List<TransportAssignment> conflicts = assignmentRepository.findAssetConflicts(
                    asset.getAssetId(), currentPlanId, NONE, TransportPlanService.OPEN, start, end);
            if (!conflicts.isEmpty()) {
                TransportPlan confPlan = planRepository.findById(conflicts.get(0).getPlanId()).orElse(null);
                boolean inTransit = confPlan != null && TransportPlanService.IN_PROGRESS.equalsIgnoreCase(confPlan.getStatus());
                String code = confPlan != null ? formatPlanCode(confPlan.getPlanId()) : "chuyến khác";
                String reason = inTransit ? "Đang chạy chuyến " + code : "Đã phân công chuyến " + code;
                return new AssignmentDto.Option(asset.getAssetId(), label, asset.getStatus(), false, inTransit ? "IN_TRANSIT" : "ASSIGNED", reason);
            }
        }

        return new AssignmentDto.Option(asset.getAssetId(), label, asset.getStatus(), true, "AVAILABLE", null);
    }

    private AssignmentDto.Option checkUserAvailability(User user, UUID currentPlanId,
                                                        LocalDateTime start, LocalDateTime end,
                                                        String rolePrefix) {
        String label = user.getName() + (rolePrefix != null ? " (" + crewRoleLabel(user) + ")" : "");
        if (!user.isActive()) {
            return new AssignmentDto.Option(user.getUserId(), label, null, false, "INACTIVE", "Tài khoản vô hiệu hóa");
        }

        if (start != null && end != null) {
            List<TransportAssignment> conflicts = assignmentRepository.findUserConflicts(
                    user.getUserId(), currentPlanId, NONE, TransportPlanService.OPEN, start, end);
            if (!conflicts.isEmpty()) {
                TransportPlan confPlan = planRepository.findById(conflicts.get(0).getPlanId()).orElse(null);
                boolean inTransit = confPlan != null && TransportPlanService.IN_PROGRESS.equalsIgnoreCase(confPlan.getStatus());
                String code = confPlan != null ? formatPlanCode(confPlan.getPlanId()) : "chuyến khác";
                String reason = inTransit ? "Đang làm nhiệm vụ tại " + code : "Đã phân công chuyến " + code;
                return new AssignmentDto.Option(user.getUserId(), label, null, false, inTransit ? "IN_TRANSIT" : "ASSIGNED", reason);
            }
        }

        return new AssignmentDto.Option(user.getUserId(), label, null, true, "AVAILABLE", null);
    }

    private static String formatPlanCode(UUID planId) {
        return "PLAN-" + planId.toString().substring(0, 8).toUpperCase();
    }

    private static String formatTimeWindow(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) return "";
        return start.format(TIME_FMT) + " - " + end.format(TIME_FMT);
    }

    private static void apply(TransportAssignment a, AssignmentDto.Request req) {
        a.setAssetId(req.assetId());
        a.setDriverUserId(req.driverUserId());
        a.setAttendantUserId(req.attendantUserId());
    }

    private void notifyCrew(UUID userId, String roleLabel, UUID planId, UUID assignmentId) {
        if (userId == null) return;
        access.notify(userId, "ASSIGNMENT", "Phân công chuyến vận chuyển",
                "Bạn được phân công làm " + roleLabel + " cho kế hoạch " + formatPlanCode(planId) + ".",
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

    private TransportPlan lockPlanOrThrow(UUID planId) {
        return planRepository.findByIdForUpdate(planId)
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

    private static boolean canBeAssignedAsDriver(User u) {
        String staffType = AuthService.resolveStaffType(u);
        if ("DRIVER".equals(staffType)) return true;
        if ("ESCORT".equals(staffType)) return false;
        return CrewRoles.canBeDriver(u.getRoleId());
    }

    private static boolean canBeAssignedAsEscort(User u) {
        String staffType = AuthService.resolveStaffType(u);
        if ("ESCORT".equals(staffType)) return true;
        if ("DRIVER".equals(staffType)) return false;
        return CrewRoles.canBeEscort(u.getRoleId());
    }

    private static String crewRoleLabel(User u) {
        String staffType = AuthService.resolveStaffType(u);
        if ("DRIVER".equals(staffType)) return "Tài xế";
        if ("ESCORT".equals(staffType)) return "Nhân viên đi kèm";
        return "Hiện trường";
    }
}
