package com.equiflow.service;

import com.equiflow.dto.TransportRequestCreateRequest;
import com.equiflow.dto.TransportRequestResponse;
import com.equiflow.dto.TransportRequestResponse.HorseInfo;
import com.equiflow.dto.TransportRequestResponse.LocationInfo;
import com.equiflow.dto.StallConfigurationDto;
import com.equiflow.entity.Horse;
import com.equiflow.entity.Location;
import com.equiflow.entity.Notification;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.TransportRequestStall;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.NotificationRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.TransportRequestStallRepository;
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


    public static final String PENDING = "Dang tham dinh";
    public static final String MANAGER_APPROVED = "Cho chuyen vien kiem tra";
    public static final String APPROVED = "Da phe duyet";
    public static final String REJECTED = "Tu choi";
    public static final String CANCELLED = "Da huy";

    private static final String DEFAULT_CURRENCY = "USD";
    private static final String MANAGER_ROLE = "LOGISTICS_MANAGER";
    private static final String SPECIALIST_ROLE = "TRANSPORT_SPECIALIST";
    private static final String COORDINATOR_ROLE = "FLEET_COORDINATOR";

    private final TransportRequestRepository requestRepository;
    private final HorseRepository horseRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final TransportRequestStallRepository stallRepository;
    private final PricingService pricingService;

    public TransportRequestService(TransportRequestRepository requestRepository,
                                   HorseRepository horseRepository,
                                   LocationRepository locationRepository,
                                   UserRepository userRepository,
                                   NotificationRepository notificationRepository,
                                   TransportRequestStallRepository stallRepository,
                                   PricingService pricingService) {
        this.requestRepository = requestRepository;
        this.horseRepository = horseRepository;
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.stallRepository = stallRepository;
        this.pricingService = pricingService;
    }


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


        Set<UUID> horseIds = new LinkedHashSet<>(req.horseIds());
        List<Horse> horses = horseRepository.findAllById(horseIds);
        boolean allOwned = horses.size() == horseIds.size()
                && horses.stream().allMatch(h -> customerId.equals(h.getOwnerUserId()));
        if (!allOwned) {

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
        String currency = req.currency() == null || req.currency().isBlank()
                ? DEFAULT_CURRENCY : req.currency().trim().toUpperCase(Locale.ROOT);
        if (!"USD".equals(currency)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Đơn vị tiền tệ duy nhất được hỗ trợ là USD");
        }
        r.setCurrency(currency);
        r.setHorseIds(horseIds);
        r = requestRepository.saveAndFlush(r);
        saveStallConfigurations(r.getRequestId(), horseIds, req.stallConfigurations());
        pricingService.saveSelection(r.getRequestId(), customerId, true, req.pricingSelection());

        notifyManagersAndSpecialists(r, userRepository.findById(customerId).map(User::getName).orElse("Khách hàng"));
        return toResponse(r);
    }

    @Transactional(readOnly = true)
    public List<StallConfigurationDto.Response> getStallConfigurations(
            UUID requestId, UUID currentUserId, boolean customer) {
        TransportRequest request = requestRepository.findById(requestId)
                .orElseThrow(TransportRequestService::notFound);
        if (customer && !currentUserId.equals(request.getCustomerId())) {
            throw notFound();
        }
        Map<UUID, Horse> horses = horseRepository.findAllById(
                        stallRepository.findByRequestIdOrderByHorseIdAsc(requestId).stream()
                                .map(TransportRequestStall::getHorseId).toList())
                .stream().collect(Collectors.toMap(Horse::getHorseId, Function.identity()));
        return stallRepository.findByRequestIdOrderByHorseIdAsc(requestId).stream()
                .map(stall -> new StallConfigurationDto.Response(
                        stall.getHorseId(),
                        horses.containsKey(stall.getHorseId()) ? horses.get(stall.getHorseId()).getName() : null,
                        stall.getSize(), stall.getLengthMeters(), stall.getWidthMeters()))
                .toList();
    }


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

        if (customer && !currentUserId.equals(r.getCustomerId())) {
            throw notFound();
        }
        return toResponse(r);
    }


    @Transactional
    public TransportRequestResponse approve(UUID id, UUID managerId, String previewFingerprint, BigDecimal estimatedAmount) {
        if (previewFingerprint != null && !previewFingerprint.isBlank()) {
            TransportRequest req = pricingService.approveAndConfirmQuote(id, managerId, previewFingerprint);
            notifySpecialists(req);
            return toResponse(req);
        }

        // Bắt buộc xác nhận báo giá nếu đơn hàng có cấu hình gói dịch vụ
        if (pricingService.hasPricingSelection(id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Yêu cầu vận chuyển này có cấu hình gói dịch vụ; bắt buộc phải xác nhận báo giá kèm previewFingerprint.");
        }

        TransportRequest r = getPendingForUpdate(id);
        r.setStatus(MANAGER_APPROVED);
        r.setApprovedBy(managerId);
        r.setApprovedAt(LocalDateTime.now(ZoneOffset.UTC));
        if (estimatedAmount != null) {
            r.setEstimatedAmount(estimatedAmount);
            if (r.getCurrency() == null) {
                r.setCurrency("USD");
            }
        }
        r = requestRepository.saveAndFlush(r);

        notifyCustomer(r, "Yêu cầu đã được phê duyệt bước 1",
                "Yêu cầu vận chuyển của bạn đã được Logistics Manager phê duyệt và đang chuyển sang Chuyên viên kiểm tra hồ sơ.");
        notifySpecialists(r);
        return toResponse(r);
    }

    @Transactional
    public TransportRequestResponse approve(UUID id, UUID managerId, String previewFingerprint) {
        return approve(id, managerId, previewFingerprint, null);
    }

    @Transactional
    public TransportRequestResponse reject(UUID id, String reason) {
        TransportRequest r = getPendingForUpdate(id);
        r.setStatus(REJECTED);
        r.setRejectionReason(reason != null ? reason.trim() : null);
        r = requestRepository.saveAndFlush(r);

        notifyCustomer(r, "Yêu cầu vận chuyển bị từ chối",
                "Yêu cầu vận chuyển của bạn đã bị từ chối. Lý do: " + (reason != null ? reason.trim() : ""));
        return toResponse(r);
    }

    @Transactional
    public TransportRequestResponse specialistApprove(UUID id, UUID specialistId) {
        TransportRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(TransportRequestService::notFound);
        if (!MANAGER_APPROVED.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ có thể phê duyệt yêu cầu đã qua cấp quản lý (trạng thái hiện tại: " + r.getStatus() + ")");
        }
        r.setStatus(APPROVED);
        r.setSpecialistApprovedBy(specialistId);
        r.setSpecialistApprovedAt(LocalDateTime.now(ZoneOffset.UTC));
        r = requestRepository.saveAndFlush(r);

        notifyCustomer(r, "Yêu cầu vận chuyển đã được phê duyệt hoàn tất",
                "Yêu cầu vận chuyển của bạn đã được Chuyên viên kiểm tra và phê duyệt hoàn tất. Hệ thống đang lập kế hoạch vận chuyển.");
        notifyCoordinators(r);
        return toResponse(r);
    }

    @Transactional
    public TransportRequestResponse specialistReject(UUID id, UUID specialistId, String reason) {
        TransportRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(TransportRequestService::notFound);
        if (!MANAGER_APPROVED.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ có thể từ chối yêu cầu đang chờ chuyên viên kiểm tra (trạng thái hiện tại: " + r.getStatus() + ")");
        }
        r.setStatus(REJECTED);
        r.setSpecialistApprovedBy(specialistId);
        r.setSpecialistApprovedAt(LocalDateTime.now(ZoneOffset.UTC));
        r.setRejectionReason(reason != null ? reason.trim() : null);
        r = requestRepository.saveAndFlush(r);

        notifyCustomer(r, "Yêu cầu vận chuyển bị từ chối bởi chuyên viên",
                "Yêu cầu vận chuyển của bạn bị từ chối sau khi kiểm tra hồ sơ. Lý do: " + (reason != null ? reason.trim() : "Không đạt yêu cầu"));

        final UUID rejectedRequestId = r.getRequestId();
        final String reasonText = reason != null ? reason.trim() : "";
        List<Notification> managerNotifs = userRepository.findByRoleId(MANAGER_ROLE).stream()
                .map(m -> newNotification(m.getUserId(), rejectedRequestId, "Yêu cầu vận chuyển bị chuyên viên từ chối",
                        "Yêu cầu #" + rejectedRequestId.toString().substring(0, 8) + " đã bị từ chối bởi chuyên viên. Lý do: " + reasonText))
                .toList();
        notificationRepository.saveAll(managerNotifs);

        return toResponse(r);
    }

    @Transactional
    public TransportRequestResponse cancel(UUID id, UUID customerId, String reason) {
        TransportRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(TransportRequestService::notFound);
        if (!customerId.equals(r.getCustomerId())) {
            throw notFound();
        }
        if (!PENDING.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ có thể hủy yêu cầu đang chờ thẩm định (trạng thái hiện tại: " + r.getStatus() + ")");
        }
        r.setStatus(CANCELLED);
        r.setCancelledBy(customerId);
        r.setCancelledAt(LocalDateTime.now(ZoneOffset.UTC));
        r.setCancellationReason(reason.trim());
        r = requestRepository.saveAndFlush(r);
        UUID cancelledRequestId = r.getRequestId();
        List<Notification> managerNotifications = userRepository.findByRoleId(MANAGER_ROLE).stream()
                .map(manager -> newNotification(manager.getUserId(), cancelledRequestId,
                        "Yêu cầu vận chuyển đã được hủy",
                        "Khách hàng đã hủy một yêu cầu đang chờ thẩm định."))
                .toList();
        notificationRepository.saveAll(managerNotifications);
        return toResponse(r);
    }


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

    private void saveStallConfigurations(
            UUID requestId, Set<UUID> selectedHorseIds, List<StallConfigurationDto.Request> configurations) {
        if (configurations == null) return;
        Set<UUID> configuredHorseIds = configurations.stream()
                .map(StallConfigurationDto.Request::horseId)
                .collect(Collectors.toSet());
        if (configuredHorseIds.size() != configurations.size() || !configuredHorseIds.equals(selectedHorseIds)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cần cấu hình chuồng đúng một lần cho từng ngựa đã chọn");
        }
        List<TransportRequestStall> rows = configurations.stream().map(configuration -> {
            String size = configuration.size().trim().toUpperCase(Locale.ROOT);
            BigDecimal length;
            BigDecimal width;
            switch (size) {
                case "SMALL" -> { length = new BigDecimal("2.30"); width = new BigDecimal("1.00"); }
                case "MEDIUM" -> { length = new BigDecimal("2.80"); width = new BigDecimal("1.20"); }
                case "LARGE" -> { length = new BigDecimal("3.65"); width = new BigDecimal("3.65"); }
                case "EXTRA_LARGE" -> { length = new BigDecimal("4.25"); width = new BigDecimal("3.65"); }
                case "CUSTOM" -> {
                    if (configuration.lengthMeters() == null || configuration.widthMeters() == null) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                "Kích thước chuồng tùy chỉnh cần có chiều dài và chiều rộng");
                    }
                    length = configuration.lengthMeters();
                    width = configuration.widthMeters();
                }
                default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Kích thước chuồng không hợp lệ");
            }
            TransportRequestStall stall = new TransportRequestStall();
            stall.setRequestId(requestId);
            stall.setHorseId(configuration.horseId());
            stall.setSize(size);
            stall.setLengthMeters(length);
            stall.setWidthMeters(width);
            return stall;
        }).toList();
        stallRepository.saveAll(rows);
    }

    private void notifyManagersAndSpecialists(TransportRequest r, String customerName) {
        List<User> recipients = new java.util.ArrayList<>();
        recipients.addAll(userRepository.findByRoleId(MANAGER_ROLE));
        recipients.addAll(userRepository.findByRoleId(SPECIALIST_ROLE));
        List<Notification> list = recipients.stream()
                .map(u -> newNotification(u.getUserId(), r.getRequestId(), "Có yêu cầu vận chuyển mới",
                        customerName + " vừa gửi một yêu cầu vận chuyển đang chờ thẩm định."))
                .toList();
        notificationRepository.saveAll(list);
    }

    private void notifySpecialists(TransportRequest r) {
        List<Notification> list = userRepository.findByRoleId(SPECIALIST_ROLE).stream()
                .map(s -> newNotification(s.getUserId(), r.getRequestId(), "Có yêu cầu vận chuyển cần thẩm định hồ sơ",
                        "Yêu cầu #" + r.getRequestId().toString().substring(0, 8) + " đã qua phê duyệt cấp quản lý và đang chờ chuyên viên kiểm tra hồ sơ."))
                .toList();
        notificationRepository.saveAll(list);
    }

    private void notifyCoordinators(TransportRequest r) {
        List<Notification> list = userRepository.findByRoleId(COORDINATOR_ROLE).stream()
                .map(c -> newNotification(c.getUserId(), r.getRequestId(), "Đơn vận chuyển sẵn sàng lập kế hoạch",
                        "Yêu cầu #" + r.getRequestId().toString().substring(0, 8) + " đã được phê duyệt 2 cấp hoàn tất, sẵn sàng lập kế hoạch lộ trình."))
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
     * Lọc theo ?status=. Chấp nhận giá trị DB (có/không dấu) hoặc PENDING/MANAGER_APPROVED/APPROVED/REJECTED/CANCELLED.
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
            case "cho chuyen vien kiem tra", "manager approved" -> MANAGER_APPROVED;
            case "da phe duyet", "approved" -> APPROVED;
            case "tu choi", "rejected" -> REJECTED;
            case "da huy", "cancelled", "canceled" -> CANCELLED;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ (chấp nhận: PENDING, MANAGER_APPROVED, APPROVED, REJECTED, CANCELLED)");
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
            if (r.getSpecialistApprovedBy() != null) userIds.add(r.getSpecialistApprovedBy());
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
            User specialist = r.getSpecialistApprovedBy() == null ? null : users.get(r.getSpecialistApprovedBy());
            List<HorseInfo> horseInfos = r.getHorseIds().stream()
                    .map(horses::get)
                    .filter(java.util.Objects::nonNull)
                    .map(h -> new HorseInfo(h.getHorseId(), h.getName(), h.getMicrochipId(), h.getImageUrl()))
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
                    r.getSpecialistApprovedBy(),
                    specialist == null ? null : specialist.getName(),
                    r.getSpecialistApprovedAt(),
                    r.getRejectionReason(),
                    r.getCancelledBy(),
                    r.getCancelledAt(),
                    r.getCancellationReason(),
                    horseInfos,
                    r.getCreatedAt(),
                    r.getUpdatedAt());
        }).toList();
    }

    private static LocationInfo locationInfo(Location l) {
        return l == null ? null : new LocationInfo(l.getLocationId(), l.getName(), l.getCountryCode());
    }
}
