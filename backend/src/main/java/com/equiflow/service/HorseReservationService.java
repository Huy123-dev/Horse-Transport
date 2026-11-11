package com.equiflow.service;

import com.equiflow.dto.HorseAvailabilityDto;
import com.equiflow.entity.Horse;
import com.equiflow.entity.HorseTransportReservation;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.HorseTransportReservationRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class HorseReservationService {

    private static final Logger log = LoggerFactory.getLogger(HorseReservationService.class);

    private final HorseTransportReservationRepository reservationRepository;
    private final HorseRepository horseRepository;
    private final TransportRequestRepository requestRepository;
    private final TransportPlanRepository planRepository;

    public HorseReservationService(HorseTransportReservationRepository reservationRepository,
                                   HorseRepository horseRepository,
                                   TransportRequestRepository requestRepository,
                                   TransportPlanRepository planRepository) {
        this.reservationRepository = reservationRepository;
        this.horseRepository = horseRepository;
        this.requestRepository = requestRepository;
        this.planRepository = planRepository;
    }

    /**
     * Kiểm tra danh sách ngựa có đang khả dụng không.
     * Nếu có bất kỳ con ngựa nào đang tham gia đơn chưa kết thúc, từ chối với HTTP 409 Conflict
     * và thông báo rõ tên con ngựa đang bị xung đột.
     */
    @Transactional(readOnly = true)
    public void validateHorsesAvailable(Collection<UUID> horseIds) {
        if (horseIds == null || horseIds.isEmpty()) return;

        List<HorseTransportReservation> activeReservations =
                reservationRepository.findByHorseIdInAndStatus(horseIds, "ACTIVE");

        if (!activeReservations.isEmpty()) {
            Set<UUID> unavailableHorseIds = activeReservations.stream()
                    .map(HorseTransportReservation::getHorseId)
                    .collect(Collectors.toSet());

            Map<UUID, String> horseNames = horseRepository.findAllById(unavailableHorseIds).stream()
                    .collect(Collectors.toMap(Horse::getHorseId, Horse::getName));

            String conflictingNames = unavailableHorseIds.stream()
                    .map(id -> horseNames.getOrDefault(id, id.toString()))
                    .collect(Collectors.joining(", "));

            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể tạo đơn vận chuyển: Ngựa [" + conflictingNames +
                    "] đang thuộc đơn vận chuyển chưa hoàn tất. Vui lòng kiểm tra danh sách ngựa và chỉ chọn những ngựa đang khả dụng.");
        }
    }

    /**
     * Giữ quyền vận chuyển cho các con ngựa trong cùng transaction tạo đơn vận chuyển.
     * Cơ chế bảo vệ race condition 2 tầng:
     * 1. Kiểm tra ứng dụng (Application Level)
     * 2. Ràng buộc UNIQUE filtered index ở Database Level
     */
    @Transactional
    public void reserveHorsesForRequest(UUID requestId, Collection<UUID> horseIds) {
        if (horseIds == null || horseIds.isEmpty()) return;

        validateHorsesAvailable(horseIds);

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<HorseTransportReservation> newReservations = new ArrayList<>();
        for (UUID horseId : horseIds) {
            HorseTransportReservation res = new HorseTransportReservation();
            res.setHorseId(horseId);
            res.setRequestId(requestId);
            res.setStatus("ACTIVE");
            res.setReservedAt(now);
            newReservations.add(res);
        }

        try {
            reservationRepository.saveAllAndFlush(newReservations);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Database unique constraint violation during horse reservation for request {}: {}",
                    requestId, ex.getMessage());
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể tạo đơn vận chuyển: Một hoặc nhiều ngựa bạn đã chọn vừa được sử dụng trong một đơn khác. Vui lòng thử lại.");
        }
    }

    /**
     * Giải phóng ngựa khi đơn bị từ chối, hủy hoặc hoàn tất.
     */
    @Transactional
    public void releaseHorsesForRequest(UUID requestId, String reason) {
        List<HorseTransportReservation> reservations =
                reservationRepository.findByRequestIdAndStatus(requestId, "ACTIVE");
        if (reservations.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (HorseTransportReservation res : reservations) {
            res.setStatus("RELEASED");
            res.setReleasedAt(now);
            res.setReleaseReason(reason);
        }
        reservationRepository.saveAllAndFlush(reservations);
        log.info("Đã giải phóng {} lượt giữ ngựa cho đơn hàng {} (Lý do: {})",
                reservations.size(), requestId, reason);
    }

    /**
     * Lấy thông tin khả dụng chi tiết cho danh sách ngựa.
     */
    @Transactional(readOnly = true)
    public Map<UUID, HorseAvailabilityDto> getAvailabilityMap(Collection<UUID> horseIds) {
        if (horseIds == null || horseIds.isEmpty()) return Map.of();

        List<HorseTransportReservation> activeReservations =
                reservationRepository.findByHorseIdInAndStatus(horseIds, "ACTIVE");

        Map<UUID, HorseTransportReservation> resByHorse = activeReservations.stream()
                .collect(Collectors.toMap(HorseTransportReservation::getHorseId, Function.identity(), (a, b) -> a));

        Set<UUID> requestIds = activeReservations.stream()
                .map(HorseTransportReservation::getRequestId)
                .collect(Collectors.toSet());

        Map<UUID, TransportRequest> requests = requestIds.isEmpty() ? Map.of()
                : requestRepository.findAllById(requestIds).stream()
                .collect(Collectors.toMap(TransportRequest::getRequestId, Function.identity()));

        Map<UUID, List<TransportPlan>> plansByRequest = new HashMap<>();
        for (UUID reqId : requestIds) {
            plansByRequest.put(reqId, planRepository.findByRequestId(reqId));
        }

        Map<UUID, HorseAvailabilityDto> result = new HashMap<>();
        for (UUID horseId : horseIds) {
            HorseTransportReservation res = resByHorse.get(horseId);
            if (res == null) {
                result.put(horseId, new HorseAvailabilityDto(
                        horseId,
                        true,
                        "AVAILABLE",
                        "Khả dụng",
                        null,
                        null,
                        null,
                        null
                ));
            } else {
                TransportRequest req = requests.get(res.getRequestId());
                List<TransportPlan> plans = plansByRequest.getOrDefault(res.getRequestId(), List.of());
                boolean inTransit = plans.stream().anyMatch(p -> TransportPlanService.IN_PROGRESS.equalsIgnoreCase(p.getStatus()));

                String status = inTransit ? "IN_TRANSIT" : "IN_REQUEST";
                String label = inTransit ? "Đang trong chuyến vận chuyển" : "Đang có đơn vận chuyển";
                String reqStatus = req != null ? req.getStatus() : null;
                String planStatus = plans.isEmpty() ? null : plans.get(0).getStatus();

                result.put(horseId, new HorseAvailabilityDto(
                        horseId,
                        false,
                        status,
                        label,
                        res.getRequestId(),
                        reqStatus,
                        planStatus,
                        "Ngựa hiện đang được sử dụng trong một đơn khác và chỉ có thể được chọn lại sau khi đơn trước kết thúc."
                ));
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public HorseAvailabilityDto getAvailability(UUID horseId) {
        Map<UUID, HorseAvailabilityDto> map = getAvailabilityMap(List.of(horseId));
        return map.getOrDefault(horseId, new HorseAvailabilityDto(
                horseId, true, "AVAILABLE", "Khả dụng", null, null, null, null));
    }
}
