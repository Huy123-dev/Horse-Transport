package com.equiflow.service;

import com.equiflow.dto.TransportRequestCreateRequest;
import com.equiflow.dto.TransportRequestResponse;
import com.equiflow.dto.TransportRequestResponse.HorseInfo;
import com.equiflow.dto.TransportRequestResponse.LocationInfo;
import com.equiflow.entity.Horse;
import com.equiflow.entity.Location;
import com.equiflow.entity.Notification;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.NotificationRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TransportRequestService {

    // Giá trị status lưu trong DB (không dấu, khớp dữ liệu mẫu: 'Dang tham dinh', 'Da phe duyet', 'Da huy')
    public static final String PENDING = "Dang tham dinh";
    public static final String APPROVED = "Da phe duyet";
    public static final String REJECTED = "Tu choi";
    public static final String CANCELLED = "Da huy";

    private static final String DEFAULT_CURRENCY = "JPY";
    private static final String MANAGER_ROLE = "LOGISTICS_MANAGER";

    private final TransportRequestRepository requestRepository;
    private final HorseRepository horseRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public TransportRequestService(TransportRequestRepository requestRepository,
                                   HorseRepository horseRepository,
                                   LocationRepository locationRepository,
                                   UserRepository userRepository,
                                   NotificationRepository notificationRepository) {
        this.requestRepository = requestRepository;
        this.horseRepository = horseRepository;
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    // ================= CREATE (customer) =================
    @Transactional
    public TransportRequestResponse create(TransportRequestCreateRequest req, UUID customerId) {
        if (req.originLocationId().equals(req.destinationLocationId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Điểm đi và điểm đến không được trùng nhau");
        }
        if (req.scheduledDepartureDate().isBefore(LocalDate.now(ZoneOffset.UTC))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày khởi hành không được ở quá khứ");
        }
        if (req.scheduledArrivalDate().isBefore(req.scheduledDepartureDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày đến phải sau hoặc cùng ngày khởi hành");
        }
        if (!locationRepository.existsById(req.originLocationId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Điểm đi không tồn tại");
        }
        if (!locationRepository.existsById(req.destinationLocationId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Điểm đến không tồn tại");
        }

        // khử trùng lặp nhưng giữ thứ tự khách gửi lên
        Set<UUID> horseIds = new LinkedHashSet<>(req.horseIds());
        List<Horse> horses = horseRepository.findAllById(horseIds);
        boolean allOwned = horses.size() == horseIds.size()
                && horses.stream().allMatch(h -> customerId.equals(h.getOwnerUserId()));
        if (!allOwned) {
            // gộp "không tồn tại" và "không phải ngựa của bạn" để không lộ thông tin ngựa người khác
            throw new ApiException(HttpStatus.BAD_REQUEST, "Có ngựa không tồn tại hoặc không thuộc sở hữu của bạn");
        }

        TransportRequest r = new TransportRequest();
        r.setCustomerId(customerId);
        r.setOriginLocationId(req.originLocationId());
        r.setDestinationLocationId(req.destinationLocationId());
        r.setScheduledDepartureDate(req.scheduledDepartureDate());
        r.setScheduledArrivalDate(req.scheduledArrivalDate());
        r.setSpecialRequirements(blankToNull(req.specialRequirements()));
        r.setStatus(PENDING);
        r.setCurrency(req.currency() == null || req.currency().isBlank()
                ? DEFAULT_CURRENCY : req.currency().trim().toUpperCase(Locale.ROOT));
        r.setHorseIds(horseIds);
        r = requestRepository.saveAndFlush(r);

        notifyManagers(r, userRepository.findById(customerId).map(User::getName).orElse("Khách hàng"));
        return toResponse(r);
    }

    // ================= READ =================
    @Transactional(readOnly = true)
    public List<TransportRequestResponse> findMine(UUID customerId, String status) {
        String st = normalizeStatus(status);
        List<TransportRequest> list = st == null
                ? requestRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                : requestRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, st);
        return toResponses(list);
    }

    /** customer chỉ thấy yêu cầu của mình; nhân viên thấy tất cả. */
    @Transactional(readOnly = true)
    public List<TransportRequestResponse> findAll(UUID currentUserId, boolean customer, String status) {
        if (customer) {
            return findMine(currentUserId, status);
        }
        String st = normalizeStatus(status);
        List<TransportRequest> list = st == null
                ? requestRepository.findAllByOrderByCreatedAtDesc()
                : requestRepository.findByStatusOrderByCreatedAtDesc(st);
        return toResponses(list);
    }

    @Transactional(readOnly = true)
    public TransportRequestResponse findById(UUID id, UUID currentUserId, boolean customer) {
        TransportRequest r = requestRepository.findById(id).orElseThrow(TransportRequestService::notFound);
        // yêu cầu của người khác trả 404 như không tồn tại
        if (customer && !currentUserId.equals(r.getCustomerId())) {
            throw notFound();
        }
        return toResponse(r);
    }

    // ================= APPROVE / REJECT (logistics manager) =================
    @Transactional
    public TransportRequestResponse approve(UUID id, UUID managerId, BigDecimal estimatedAmount) {
        TransportRequest r = getPendingForUpdate(id);
        r.setStatus(APPROVED);
        r.setApprovedBy(managerId);
        r.setApprovedAt(LocalDateTime.now(ZoneOffset.UTC));
        if (estimatedAmount != null) {
            r.setEstimatedAmount(estimatedAmount);
        }
        r = requestRepository.saveAndFlush(r);

        notifyCustomer(r, "Đơn hàng đã được phê duyệt",
                "Yêu cầu vận chuyển của bạn đã được Logistics Manager phê duyệt.");
        return toResponse(r);
    }

    @Transactional
    public TransportRequestResponse reject(UUID id, String reason) {
        TransportRequest r = getPendingForUpdate(id);
        r.setStatus(REJECTED);
        r = requestRepository.saveAndFlush(r);

        notifyCustomer(r, "Yêu cầu vận chuyển bị từ chối",
                "Yêu cầu vận chuyển của bạn đã bị từ chối. Lý do: " + reason.trim());
        return toResponse(r);
    }

    // ================= helpers =================
    private TransportRequest getPendingForUpdate(UUID id) {
        TransportRequest r = requestRepository.findByIdForUpdate(id).orElseThrow(TransportRequestService::notFound);
        if (!PENDING.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ xử lý được yêu cầu đang chờ thẩm định (trạng thái hiện tại: " + r.getStatus() + ")");
        }
        return r;
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu vận chuyển");
    }

    private void notifyCustomer(TransportRequest r, String title, String message) {
        notificationRepository.save(newNotification(r.getCustomerId(), r.getRequestId(), title, message));
    }

    private void notifyManagers(TransportRequest r, String customerName) {
        List<Notification> list = userRepository.findByRoleId(MANAGER_ROLE).stream()
                .map(m -> newNotification(m.getUserId(), r.getRequestId(), "Có yêu cầu vận chuyển mới",
                        customerName + " vừa gửi một yêu cầu vận chuyển đang chờ thẩm định."))
                .toList();
        notificationRepository.saveAll(list);
    }

    private static Notification newNotification(UUID recipient, UUID requestId, String title, String message) {
        Notification n = new Notification();
        n.setRecipientUserId(recipient);
        n.setType("REQUEST_STATUS");
        n.setTitle(title);
        n.setMessage(message);
        n.setRelatedEntityType("transport_requests");
        n.setRelatedEntityId(requestId);
        n.setRead(false);
        return n;
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * Lọc theo ?status=. Chấp nhận giá trị DB (có/không dấu) hoặc PENDING/APPROVED/REJECTED/CANCELLED.
     * Không truyền thì không lọc.
     */
    private static String normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replace('_', ' ');
        return switch (s) {
            case "dang tham dinh", "pending" -> PENDING;
            case "da phe duyet", "approved" -> APPROVED;
            case "tu choi", "rejected" -> REJECTED;
            case "da huy", "cancelled", "canceled" -> CANCELLED;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ (chấp nhận: PENDING, APPROVED, REJECTED, CANCELLED)");
        };
    }

    private TransportRequestResponse toResponse(TransportRequest r) {
        return toResponses(List.of(r)).get(0);
    }

    /** Tra cứu hàng loạt user/địa điểm/ngựa một lần để tránh N+1 khi trả danh sách. */
    private List<TransportRequestResponse> toResponses(List<TransportRequest> requests) {
        Set<UUID> userIds = new LinkedHashSet<>();
        Set<UUID> locationIds = new LinkedHashSet<>();
        Set<UUID> horseIds = new LinkedHashSet<>();
        for (TransportRequest r : requests) {
            userIds.add(r.getCustomerId());
            if (r.getApprovedBy() != null) userIds.add(r.getApprovedBy());
            locationIds.add(r.getOriginLocationId());
            locationIds.add(r.getDestinationLocationId());
            horseIds.addAll(r.getHorseIds());
        }
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        Map<UUID, Location> locations = locationRepository.findAllById(locationIds).stream()
                .collect(Collectors.toMap(Location::getLocationId, Function.identity()));
        Map<UUID, Horse> horses = horseRepository.findAllById(horseIds).stream()
                .collect(Collectors.toMap(Horse::getHorseId, Function.identity()));

        return requests.stream().map(r -> {
            User customer = users.get(r.getCustomerId());
            User approver = r.getApprovedBy() == null ? null : users.get(r.getApprovedBy());
            List<HorseInfo> horseInfos = r.getHorseIds().stream()
                    .map(horses::get)
                    .filter(java.util.Objects::nonNull)
                    .map(h -> new HorseInfo(h.getHorseId(), h.getName(), h.getMicrochipId()))
                    .toList();
            return new TransportRequestResponse(
                    r.getRequestId(),
                    r.getCustomerId(),
                    customer == null ? null : customer.getName(),
                    locationInfo(locations.get(r.getOriginLocationId())),
                    locationInfo(locations.get(r.getDestinationLocationId())),
                    r.getScheduledDepartureDate(),
                    r.getScheduledArrivalDate(),
                    r.getSpecialRequirements(),
                    r.getStatus(),
                    r.getEstimatedAmount(),
                    r.getCurrency(),
                    r.getApprovedBy(),
                    approver == null ? null : approver.getName(),
                    r.getApprovedAt(),
                    horseInfos,
                    r.getCreatedAt(),
                    r.getUpdatedAt());
        }).toList();
    }

    private static LocationInfo locationInfo(Location l) {
        return l == null ? null : new LocationInfo(l.getLocationId(), l.getName(), l.getCountryCode());
    }
}
