package com.equiflow.service;

import com.equiflow.dto.TrackingDto;
import com.equiflow.entity.TrackingLog;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.TrackingLogRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
public class TrackingService {

    /** Chỉ ghi hành trình khi chuyến đã sẵn sàng (mốc "chuẩn bị khởi hành") hoặc đang thực hiện. */
    private static final Set<String> TRACKABLE = Set.of(TransportPlanService.READY, TransportPlanService.IN_PROGRESS);

    private final TrackingLogRepository trackingRepository;
    private final TransportPlanRepository planRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;

    public TrackingService(TrackingLogRepository trackingRepository, TransportPlanRepository planRepository,
                           UserRepository userRepository, RequestAccessService access) {
        this.trackingRepository = trackingRepository;
        this.planRepository = planRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    /** Tài xế / người đi kèm được phân công cập nhật vị trí hoặc mốc hành trình. */
    @Transactional
    public TrackingDto.Response create(TrackingDto.Request req, UUID reporterId) {
        TransportPlan plan = planOrThrow(req.planId());
        if (trackingRepository.countCrewAssignments(plan.getPlanId(), reporterId) == 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không được phân công cho kế hoạch vận chuyển này");
        }
        if (!TRACKABLE.contains(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ cập nhật hành trình khi kế hoạch ở trạng thái sẵn sàng hoặc đang thực hiện (hiện tại: "
                            + plan.getStatus() + ")");
        }
        TrackingLog log = new TrackingLog();
        log.setPlanId(plan.getPlanId());
        log.setMilestone(blankToNull(req.milestone()));
        // cột DECIMAL(9,6): làm tròn về 6 chữ số thập phân thay vì báo lỗi khi GPS gửi nhiều hơn
        log.setLatitude(req.latitude().setScale(6, RoundingMode.HALF_UP));
        log.setLongitude(req.longitude().setScale(6, RoundingMode.HALF_UP));
        log.setReportedBy(reporterId);
        return toResponses(List.of(trackingRepository.save(log))).get(0);
    }

    @Transactional(readOnly = true)
    public List<TrackingDto.Response> findByPlan(UUID planId, UUID currentUserId, boolean customer) {
        checkViewable(planId, currentUserId, customer);
        return toResponses(trackingRepository.findByPlanIdOrderByReportedAtAsc(planId));
    }

    @Transactional(readOnly = true)
    public TrackingDto.Response findLatest(UUID planId, UUID currentUserId, boolean customer) {
        checkViewable(planId, currentUserId, customer);
        TrackingLog latest = trackingRepository.findFirstByPlanIdOrderByReportedAtDesc(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Kế hoạch này chưa có dữ liệu hành trình"));
        return toResponses(List.of(latest)).get(0);
    }

    // ================= helpers =================
    /** Customer chỉ xem hành trình của kế hoạch thuộc yêu cầu của mình. */
    private void checkViewable(UUID planId, UUID currentUserId, boolean customer) {
        TransportPlan plan = planOrThrow(planId);
        if (customer) access.assertCustomerOwns(plan.getRequestId(), currentUserId);
    }

    private TransportPlan planOrThrow(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private List<TrackingDto.Response> toResponses(List<TrackingLog> logs) {
        Set<UUID> userIds = logs.stream().map(TrackingLog::getReportedBy)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        return logs.stream().map(l -> {
            User u = users.get(l.getReportedBy());
            return new TrackingDto.Response(l.getLogId(), l.getPlanId(), l.getMilestone(), l.getLatitude(),
                    l.getLongitude(), l.getReportedAt(), l.getReportedBy(), u == null ? null : u.getName());
        }).toList();
    }
}
