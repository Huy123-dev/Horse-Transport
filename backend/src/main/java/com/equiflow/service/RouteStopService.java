package com.equiflow.service;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.RouteStopDto;
import com.equiflow.entity.Location;
import com.equiflow.entity.RouteStop;
import com.equiflow.entity.TransportPlan;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.RouteStopRepository;
import com.equiflow.repository.TransportPlanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class RouteStopService {

    private static final Set<String> TYPES =
            Set.of("ORIGIN", "TRANSIT", "CUSTOMS", "QUARANTINE", "REST", "REFUEL", "DESTINATION");

    private final RouteStopRepository stopRepository;
    private final TransportPlanRepository planRepository;
    private final LocationRepository locationRepository;
    private final RequestAccessService access;
    private final CrewAssignmentAccessService crewAccess;

    public RouteStopService(RouteStopRepository stopRepository, TransportPlanRepository planRepository,
                            LocationRepository locationRepository, RequestAccessService access,
                            CrewAssignmentAccessService crewAccess) {
        this.stopRepository = stopRepository;
        this.planRepository = planRepository;
        this.locationRepository = locationRepository;
        this.access = access;
        this.crewAccess = crewAccess;
    }

    @Transactional
    public RouteStopDto.Response create(UUID planId, RouteStopDto.Request req) {
        TransportPlan plan = planOrThrow(planId);
        assertEditable(plan);
        int seq = req.sequenceNo() != null ? req.sequenceNo() : stopRepository.maxSequenceNo(planId) + 1;
        if (stopRepository.existsByPlanIdAndSequenceNo(planId, seq)) {
            throw new ApiException(HttpStatus.CONFLICT, "Thứ tự điểm dừng " + seq + " đã tồn tại trong kế hoạch");
        }
        RouteStop s = new RouteStop();
        s.setPlanId(planId);
        s.setSequenceNo(seq);
        apply(s, req);
        return toResponse(stopRepository.save(s));
    }

    @Transactional(readOnly = true)
    public List<RouteStopDto.Response> findByPlan(UUID planId, UUID currentUserId, boolean customer,
                                                  boolean driverEscort) {
        TransportPlan plan = planOrThrow(planId);
        if (customer) access.assertCustomerOwns(plan.getRequestId(), currentUserId);
        if (driverEscort) crewAccess.assertAssigned(planId, currentUserId);
        return toResponses(stopRepository.findByPlanIdOrderBySequenceNoAsc(planId));
    }

    @Transactional(readOnly = true)
    public RouteStopDto.Response findById(UUID id, UUID currentUserId, boolean customer, boolean driverEscort) {
        RouteStop s = stopRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        driverEscort ? "Không tìm thấy kế hoạch vận chuyển" : "Không tìm thấy điểm dừng"));
        TransportPlan plan = planOrThrow(s.getPlanId());
        if (customer) access.assertCustomerOwns(plan.getRequestId(), currentUserId);
        if (driverEscort) crewAccess.assertAssigned(plan.getPlanId(), currentUserId);
        return toResponse(s);
    }

    /** Sửa được cả khi chuyến đang thực hiện (để cập nhật giờ đến/đi thực tế). */
    @Transactional
    public RouteStopDto.Response update(UUID id, RouteStopDto.Request req) {
        RouteStop s = getOrThrow(id);
        TransportPlan plan = planOrThrow(s.getPlanId());
        if (!TransportPlanService.OPEN.contains(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể thay đổi điểm dừng khi kế hoạch ở trạng thái: " + plan.getStatus());
        }
        if (req.sequenceNo() != null && !req.sequenceNo().equals(s.getSequenceNo())) {
            if (stopRepository.existsByPlanIdAndSequenceNoAndStopIdNot(s.getPlanId(), req.sequenceNo(), id)) {
                throw new ApiException(HttpStatus.CONFLICT, "Thứ tự điểm dừng " + req.sequenceNo() + " đã tồn tại trong kế hoạch");
            }
            s.setSequenceNo(req.sequenceNo());
        }
        apply(s, req);
        return toResponse(stopRepository.save(s));
    }

    @Transactional
    public MessageResponse delete(UUID id) {
        RouteStop s = getOrThrow(id);
        assertEditable(planOrThrow(s.getPlanId()));
        stopRepository.delete(s);
        return new MessageResponse("Đã xóa điểm dừng");
    }

    private void apply(RouteStop s, RouteStopDto.Request req) {
        String type = req.stopType().trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Loại điểm dừng không hợp lệ (chấp nhận: ORIGIN, TRANSIT, CUSTOMS, QUARANTINE, REST, REFUEL, DESTINATION)");
        }
        String name = blankToNull(req.stopName());
        if (req.locationId() != null) {
            Location l = locationRepository.findById(req.locationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Địa điểm không tồn tại"));
            if (name == null) name = l.getName();
        }
        if (name == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập tên điểm dừng hoặc chọn địa điểm");
        }
        checkOrder(req.plannedArrivalTime(), req.plannedDepartureTime(), "dự kiến");
        checkOrder(req.actualArrivalTime(), req.actualDepartureTime(), "thực tế");

        s.setLocationId(req.locationId());
        s.setStopName(name);
        s.setStopType(type);
        s.setPlannedArrivalTime(req.plannedArrivalTime());
        s.setPlannedDepartureTime(req.plannedDepartureTime());
        s.setActualArrivalTime(req.actualArrivalTime());
        s.setActualDepartureTime(req.actualDepartureTime());
        s.setNotes(blankToNull(req.notes()));
    }

    private static void checkOrder(LocalDateTime arrival, LocalDateTime departure, String label) {
        if (arrival != null && departure != null && departure.isBefore(arrival)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Giờ rời đi " + label + " không được trước giờ đến");
        }
    }

    /** Chỉ thêm/xóa điểm dừng khi kế hoạch còn đang lập hoặc sẵn sàng. */
    private static void assertEditable(TransportPlan plan) {
        if (!TransportPlanService.EDITABLE.contains(plan.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể thêm/xóa điểm dừng khi kế hoạch ở trạng thái: " + plan.getStatus());
        }
    }

    private TransportPlan planOrThrow(UUID planId) {
        return planRepository.findById(planId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kế hoạch vận chuyển"));
    }

    private RouteStop getOrThrow(UUID id) {
        return stopRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy điểm dừng"));
    }

    private RouteStopDto.Response toResponse(RouteStop s) {
        return toResponses(List.of(s)).get(0);
    }

    private List<RouteStopDto.Response> toResponses(List<RouteStop> stops) {
        Set<UUID> locationIds = stops.stream().map(RouteStop::getLocationId).filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Location> locations = locationRepository.findAllById(locationIds).stream()
                .collect(Collectors.toMap(Location::getLocationId, Function.identity()));
        return stops.stream().map(s -> {
            Location l = s.getLocationId() == null ? null : locations.get(s.getLocationId());
            return new RouteStopDto.Response(s.getStopId(), s.getPlanId(), s.getSequenceNo(), s.getLocationId(),
                    l == null ? null : l.getName(), l == null ? null : l.getCountryCode(),
                    s.getStopName(), s.getStopType(), s.getPlannedArrivalTime(), s.getPlannedDepartureTime(),
                    s.getActualArrivalTime(), s.getActualDepartureTime(), s.getNotes());
        }).toList();
    }
}
