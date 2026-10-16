package com.equiflow.service;

import com.equiflow.entity.Notification;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.NotificationRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Các kiểm tra/việc dùng chung của phần Người 2:
 * truy cập yêu cầu vận chuyển (đã phê duyệt, quyền sở hữu của customer) và gửi thông báo.
 */
@Service
public class RequestAccessService {

    private final TransportRequestRepository requestRepository;
    private final NotificationRepository notificationRepository;

    public RequestAccessService(TransportRequestRepository requestRepository,
                                NotificationRepository notificationRepository) {
        this.requestRepository = requestRepository;
        this.notificationRepository = notificationRepository;
    }

    public TransportRequest getOrThrow(UUID requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu vận chuyển"));
    }

    /** Chỉ cho thao tác nghiệp vụ (kiểm tra, lập kế hoạch, đặt lịch kiểm dịch) trên yêu cầu đã được phê duyệt. */
    public TransportRequest getApprovedOrThrow(UUID requestId) {
        TransportRequest r = getOrThrow(requestId);
        if (!TransportRequestService.APPROVED.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ thao tác được trên yêu cầu đã phê duyệt (trạng thái hiện tại: " + r.getStatus() + ")");
        }
        return r;
    }

    /** Customer chỉ xem dữ liệu thuộc yêu cầu của mình; của người khác trả 404 như không tồn tại. */
    public void assertCustomerOwns(UUID requestId, UUID customerId) {
        if (!customerId.equals(getOrThrow(requestId).getCustomerId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu vận chuyển");
        }
    }

    public Set<UUID> requestIdsOf(UUID customerId) {
        return requestRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(TransportRequest::getRequestId)
                .collect(Collectors.toSet());
    }

    /** Số ngựa của từng yêu cầu (gọi trong @Transactional vì horseIds là collection lazy). */
    public Map<UUID, Integer> horseCounts(Collection<UUID> requestIds) {
        return requestRepository.findAllById(requestIds).stream()
                .collect(Collectors.toMap(TransportRequest::getRequestId, r -> r.getHorseIds().size()));
    }

    /** type phải nằm trong ràng buộc CHECK của bảng notifications (INSPECTION_UPDATE, PLAN_UPDATE, ...). */
    public void notify(UUID recipientUserId, String type, String title, String message,
                       String relatedEntityType, UUID relatedEntityId) {
        Notification n = new Notification();
        n.setRecipientUserId(recipientUserId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setRelatedEntityType(relatedEntityType);
        n.setRelatedEntityId(relatedEntityId);
        n.setRead(false);
        notificationRepository.save(n);
    }
}
