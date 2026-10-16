package com.equiflow.service;

import com.equiflow.dto.InspectionDto;
import com.equiflow.entity.Horse;
import com.equiflow.entity.Inspection;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.InspectionRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class InspectionService {

    // Giá trị status lưu trong DB (không dấu, theo dữ liệu mẫu: 'Da phe duyet', 'Dang xu ly', 'Yeu cau bo sung ho so')
    public static final String PENDING = "Cho xu ly";
    public static final String PROCESSING = "Dang xu ly";
    public static final String NEEDS_INFO = "Yeu cau bo sung ho so";
    public static final String APPROVED = "Da phe duyet";
    public static final String REJECTED = "Tu choi";

    private static final Map<String, String> STATUS_ALIASES = Map.ofEntries(
            Map.entry("cho xu ly", PENDING), Map.entry("pending", PENDING),
            Map.entry("dang xu ly", PROCESSING), Map.entry("processing", PROCESSING),
            Map.entry("yeu cau bo sung ho so", NEEDS_INFO), Map.entry("needs info", NEEDS_INFO),
            Map.entry("da phe duyet", APPROVED), Map.entry("approved", APPROVED),
            Map.entry("tu choi", REJECTED), Map.entry("rejected", REJECTED));
    private static final String STATUS_HINT = "PENDING, PROCESSING, NEEDS_INFO, APPROVED, REJECTED";

    private static final String SPECIALIST_ROLE = "TRANSPORT_SPECIALIST";

    private final InspectionRepository inspectionRepository;
    private final HorseRepository horseRepository;
    private final UserRepository userRepository;
    private final RequestAccessService access;

    public InspectionService(InspectionRepository inspectionRepository, HorseRepository horseRepository,
                             UserRepository userRepository, RequestAccessService access) {
        this.inspectionRepository = inspectionRepository;
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    // ================= CREATE =================
    @Transactional
    public InspectionDto.Response create(InspectionDto.CreateRequest req, UUID currentUserId) {
        TransportRequest request = access.getApprovedOrThrow(req.requestId());
        if (!request.getHorseIds().contains(req.horseId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngựa không thuộc yêu cầu vận chuyển này");
        }
        UUID specialistId = currentUserId;
        if (req.assignedSpecialistId() != null) {
            User u = userRepository.findById(req.assignedSpecialistId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Chuyên viên được giao không tồn tại"));
            if (!SPECIALIST_ROLE.equals(u.getRoleId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ giao được cho tài khoản có vai trò " + SPECIALIST_ROLE);
            }
            specialistId = u.getUserId();
        }

        Inspection i = new Inspection();
        i.setRequestId(request.getRequestId());
        i.setHorseId(req.horseId());
        i.setAgencyName(req.agencyName().trim());
        i.setStatus(PENDING);
        i.setRemarks(blankToNull(req.remarks()));
        i.setAssignedSpecialistId(specialistId);
        return toResponse(inspectionRepository.saveAndFlush(i));
    }

    // ================= READ =================
    @Transactional(readOnly = true)
    public List<InspectionDto.Response> findAll(UUID currentUserId, boolean customer, String status) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        List<Inspection> list;
        if (customer) {
            Set<UUID> requestIds = access.requestIdsOf(currentUserId);
            list = requestIds.isEmpty() ? List.of()
                    : inspectionRepository.findByRequestIdInOrderByUpdatedAtDesc(requestIds);
        } else {
            list = inspectionRepository.findAllByOrderByUpdatedAtDesc();
        }
        if (st != null) {
            list = list.stream().filter(i -> st.equals(i.getStatus())).toList();
        }
        return toResponses(list);
    }

    @Transactional(readOnly = true)
    public InspectionDto.Response findById(UUID id, UUID currentUserId, boolean customer) {
        Inspection i = getOrThrow(id);
        if (customer) access.assertCustomerOwns(i.getRequestId(), currentUserId);
        return toResponse(i);
    }

    @Transactional(readOnly = true)
    public List<InspectionDto.Response> findByRequest(UUID requestId, UUID currentUserId, boolean customer) {
        access.getOrThrow(requestId); // 404 nếu yêu cầu không tồn tại
        if (customer) access.assertCustomerOwns(requestId, currentUserId);
        return toResponses(inspectionRepository.findByRequestIdOrderByUpdatedAtDesc(requestId));
    }

    // ================= UPDATE STATUS =================
    @Transactional
    public InspectionDto.Response updateStatus(UUID id, InspectionDto.StatusRequest req, UUID currentUserId) {
        Inspection i = getOrThrow(id);
        String newStatus = StatusSupport.normalize(req.status(), STATUS_ALIASES, STATUS_HINT);

        if (APPROVED.equals(i.getStatus()) && !APPROVED.equals(newStatus)) {
            throw new ApiException(HttpStatus.CONFLICT, "Hồ sơ đã được phê duyệt, không thể đổi trạng thái");
        }
        if (newStatus.equals(i.getStatus())) {
            return toResponse(i); // không đổi gì
        }
        String remarks = blankToNull(req.remarks());
        if ((REJECTED.equals(newStatus) || NEEDS_INFO.equals(newStatus)) && remarks == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng ghi rõ lý do/hồ sơ cần bổ sung (remarks)");
        }

        i.setStatus(newStatus);
        if (remarks != null) i.setRemarks(remarks);
        if (i.getAssignedSpecialistId() == null) i.setAssignedSpecialistId(currentUserId);
        i = inspectionRepository.saveAndFlush(i);

        UUID customerId = access.getOrThrow(i.getRequestId()).getCustomerId();
        access.notify(customerId, "INSPECTION_UPDATE", "Cập nhật kiểm tra hồ sơ",
                "Hồ sơ kiểm dịch/thông quan (" + i.getAgencyName() + ") chuyển sang: " + newStatus
                        + (remarks == null ? "" : ". " + remarks),
                "inspection_statuses", i.getInspectionId());
        return toResponse(i);
    }

    // ================= helpers =================
    private Inspection getOrThrow(UUID id) {
        return inspectionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy bản ghi kiểm tra"));
    }

    private InspectionDto.Response toResponse(Inspection i) {
        return toResponses(List.of(i)).get(0);
    }

    /** Tra cứu hàng loạt ngựa/chuyên viên một lần để tránh N+1. */
    private List<InspectionDto.Response> toResponses(List<Inspection> list) {
        Set<UUID> horseIds = list.stream().map(Inspection::getHorseId).collect(Collectors.toCollection(LinkedHashSet::new));
        Set<UUID> userIds = list.stream().map(Inspection::getAssignedSpecialistId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Horse> horses = horseRepository.findAllById(horseIds).stream()
                .collect(Collectors.toMap(Horse::getHorseId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));

        return list.stream().map(i -> {
            Horse h = horses.get(i.getHorseId());
            User u = i.getAssignedSpecialistId() == null ? null : users.get(i.getAssignedSpecialistId());
            return new InspectionDto.Response(i.getInspectionId(), i.getRequestId(), i.getHorseId(),
                    h == null ? null : h.getName(), i.getAgencyName(), i.getStatus(), i.getRemarks(),
                    i.getAssignedSpecialistId(), u == null ? null : u.getName(), i.getUpdatedAt());
        }).toList();
    }
}
