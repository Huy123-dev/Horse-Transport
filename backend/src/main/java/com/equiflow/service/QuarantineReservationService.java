package com.equiflow.service;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.QuarantineReservationDto;
import com.equiflow.entity.Location;
import com.equiflow.entity.QuarantineReservation;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.QuarantineReservationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class QuarantineReservationService {

    public static final String PENDING = "Cho xac nhan";
    public static final String CONFIRMED = "Da xac nhan cho";
    public static final String IN_QUARANTINE = "Dang kiem dich";
    public static final String COMPLETED = "Hoan thanh";
    public static final String CANCELLED = "Da huy";

    /** Các lịch còn chiếm chỗ tại cơ sở kiểm dịch. */
    private static final Set<String> ACTIVE = Set.of(PENDING, CONFIRMED, IN_QUARANTINE);

    private static final Map<String, String> STATUS_ALIASES = Map.ofEntries(
            Map.entry("cho xac nhan", PENDING), Map.entry("pending", PENDING),
            Map.entry("da xac nhan cho", CONFIRMED), Map.entry("da xac nhan", CONFIRMED), Map.entry("confirmed", CONFIRMED),
            Map.entry("dang kiem dich", IN_QUARANTINE), Map.entry("in quarantine", IN_QUARANTINE),
            Map.entry("hoan thanh", COMPLETED), Map.entry("completed", COMPLETED),
            Map.entry("da huy", CANCELLED), Map.entry("cancelled", CANCELLED), Map.entry("canceled", CANCELLED));
    private static final String STATUS_HINT = "PENDING, CONFIRMED, IN_QUARANTINE, COMPLETED, CANCELLED";

    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(IN_QUARANTINE, CANCELLED),
            IN_QUARANTINE, Set.of(COMPLETED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of());

    private final QuarantineReservationRepository repository;
    private final LocationRepository locationRepository;
    private final RequestAccessService access;

    public QuarantineReservationService(QuarantineReservationRepository repository,
                                        LocationRepository locationRepository,
                                        RequestAccessService access) {
        this.repository = repository;
        this.locationRepository = locationRepository;
        this.access = access;
    }

    @Transactional
    public QuarantineReservationDto.Response create(QuarantineReservationDto.CreateRequest req,
                                                     UUID currentUserId, boolean customer) {
        if (customer) {
            access.assertCustomerOwns(req.requestId(), currentUserId);
        }
        TransportRequest request = access.getApprovedOrThrow(req.requestId());
        int horseCount = request.getHorseIds().size();
        if (horseCount < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu vận chuyển chưa có ngựa nào để đặt lịch kiểm dịch");
        }
        checkFacility(req.facilityLocationId(), req.startDate(), req.endDate(), horseCount, null);

        QuarantineReservation r = new QuarantineReservation();
        r.setRequestId(request.getRequestId());
        r.setFacilityLocationId(req.facilityLocationId());
        r.setStartDate(req.startDate());
        r.setEndDate(req.endDate());
        r.setStatus(PENDING);
        return toResponse(repository.save(r));
    }

    @Transactional(readOnly = true)
    public List<QuarantineReservationDto.Response> findAll(UUID currentUserId, boolean customer, String status) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        List<QuarantineReservation> list;
        if (customer) {
            Set<UUID> requestIds = access.requestIdsOf(currentUserId);
            list = requestIds.isEmpty() ? List.of() : repository.findByRequestIdInOrderByStartDateDesc(requestIds);
        } else {
            list = repository.findAllByOrderByStartDateDesc();
        }
        if (st != null) {
            list = list.stream().filter(r -> st.equals(r.getStatus())).toList();
        }
        return toResponses(list);
    }

    @Transactional(readOnly = true)
    public QuarantineReservationDto.Response findById(UUID id, UUID currentUserId, boolean customer) {
        QuarantineReservation r = getOrThrow(id);
        if (customer) access.assertCustomerOwns(r.getRequestId(), currentUserId);
        return toResponse(r);
    }

    @Transactional
    public QuarantineReservationDto.Response update(UUID id, QuarantineReservationDto.UpdateRequest req) {
        QuarantineReservation r = getOrThrow(id);
        if (!PENDING.equals(r.getStatus()) && !CONFIRMED.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Chỉ sửa được lịch chưa bắt đầu kiểm dịch (hiện tại: " + r.getStatus() + ")");
        }
        int horseCount = access.getOrThrow(r.getRequestId()).getHorseIds().size();
        checkFacility(req.facilityLocationId(), req.startDate(), req.endDate(), horseCount, r.getReservationId());

        r.setFacilityLocationId(req.facilityLocationId());
        r.setStartDate(req.startDate());
        r.setEndDate(req.endDate());
        return toResponse(repository.save(r));
    }

    @Transactional
    public QuarantineReservationDto.Response updateStatus(UUID id, QuarantineReservationDto.StatusRequest req) {
        QuarantineReservation r = getOrThrow(id);
        String target = StatusSupport.normalize(req.status(), STATUS_ALIASES, STATUS_HINT);
        if (target.equals(r.getStatus())) {
            return toResponse(r);
        }
        if (!TRANSITIONS.getOrDefault(r.getStatus(), Set.of()).contains(target)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể chuyển lịch từ '" + r.getStatus() + "' sang '" + target + "'");
        }
        r.setStatus(target);
        r = repository.saveAndFlush(r);

        UUID customerId = access.getOrThrow(r.getRequestId()).getCustomerId();
        access.notify(customerId, "QUARANTINE", "Cập nhật lịch kiểm dịch",
                "Lịch kiểm dịch của yêu cầu vận chuyển chuyển sang: " + target,
                "quarantine_reservations", r.getReservationId());
        return toResponse(r);
    }

    /**
     * DELETE = hủy/xóa: lịch chờ xác nhận hoặc đã hủy thì xóa hẳn; lịch đã xác nhận thì chuyển sang "đã hủy";
     * lịch đang kiểm dịch/đã hoàn thành không được xóa.
     */
    @Transactional
    public MessageResponse delete(UUID id) {
        QuarantineReservation r = getOrThrow(id);
        String st = r.getStatus();
        if (PENDING.equals(st) || CANCELLED.equals(st)) {
            repository.delete(r);
            return new MessageResponse("Đã xóa lịch đặt kiểm dịch");
        }
        if (CONFIRMED.equals(st)) {
            r.setStatus(CANCELLED);
            repository.save(r);
            return new MessageResponse("Đã hủy lịch đặt kiểm dịch");
        }
        throw new ApiException(HttpStatus.CONFLICT, "Không thể hủy lịch ở trạng thái: " + st);
    }

    /**
     * Kiểm tra ngày, cơ sở tồn tại và còn đủ chỗ trong khoảng ngày đặt.
     * DB không lưu số ngựa theo lịch nên số ngựa được tính từ yêu cầu vận chuyển tương ứng.
     */
    private void checkFacility(UUID facilityId, LocalDate start, LocalDate end, int horseCount, UUID excludeId) {
        if (end.isBefore(start)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày kết thúc phải sau hoặc cùng ngày bắt đầu");
        }
        Location facility = locationRepository.findById(facilityId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Cơ sở kiểm dịch không tồn tại"));
        if (facility.getCapacity() == null) {
            return; // không giới hạn sức chứa
        }
        List<QuarantineReservation> overlapping = repository.findOverlapping(facilityId, ACTIVE, start, end).stream()
                .filter(o -> excludeId == null || !o.getReservationId().equals(excludeId))
                .toList();
        Map<UUID, Integer> counts = access.horseCounts(
                overlapping.stream().map(QuarantineReservation::getRequestId).collect(Collectors.toSet()));
        int reserved = overlapping.stream().mapToInt(o -> counts.getOrDefault(o.getRequestId(), 0)).sum();
        if (reserved + horseCount > facility.getCapacity()) {
            throw new ApiException(HttpStatus.CONFLICT, "Cơ sở không đủ chỗ trong khoảng thời gian này (sức chứa "
                    + facility.getCapacity() + ", đã đặt " + reserved + ", cần thêm " + horseCount + ")");
        }
    }

    private QuarantineReservation getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch đặt kiểm dịch"));
    }

    private QuarantineReservationDto.Response toResponse(QuarantineReservation r) {
        return toResponses(List.of(r)).get(0);
    }

    private List<QuarantineReservationDto.Response> toResponses(List<QuarantineReservation> list) {
        Set<UUID> locationIds = list.stream().map(QuarantineReservation::getFacilityLocationId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Location> locations = locationRepository.findAllById(locationIds).stream()
                .collect(Collectors.toMap(Location::getLocationId, Function.identity()));
        Map<UUID, Integer> counts = access.horseCounts(
                list.stream().map(QuarantineReservation::getRequestId).collect(Collectors.toSet()));
        return list.stream().map(r -> {
            Location l = locations.get(r.getFacilityLocationId());
            return new QuarantineReservationDto.Response(r.getReservationId(), r.getRequestId(),
                    r.getFacilityLocationId(), l == null ? null : l.getName(), r.getStartDate(), r.getEndDate(),
                    counts.get(r.getRequestId()), r.getStatus());
        }).toList();
    }
}
