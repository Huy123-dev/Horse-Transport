package com.equiflow.service;

import com.equiflow.dto.AuditLogDto;
import com.equiflow.entity.AuditLog;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.AuditLogRepository;
import com.equiflow.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private static final int MAX_PAGE_SIZE = 200;

    private final AuditLogRepository repository;
    private final UserRepository userRepository;

    public AuditLogService(AuditLogRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    /**
     * Danh sách mới nhất trước, lọc tùy chọn theo người thực hiện, hành động (chứa chuỗi, không phân biệt hoa thường)
     * và khoảng thời gian. Phân trang bằng page (từ 0) và size (tối đa 200).
     */
    @Transactional(readOnly = true)
    public List<AuditLogDto.Response> findAll(UUID userId, String action, LocalDateTime from, LocalDateTime to,
                                              int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "page phải >= 0 và size trong khoảng 1-" + MAX_PAGE_SIZE);
        }
        if (from != null && to != null && to.isBefore(from)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Thời điểm kết thúc phải sau thời điểm bắt đầu");
        }
        String keyword = StatusSupport.blankToNull(action);

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (userId != null) ps.add(cb.equal(root.get("userId"), userId));
            if (keyword != null) {
                String escaped = keyword.toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
                ps.add(cb.like(cb.lower(root.get("action")), "%" + escaped + "%", '\\'));
            }
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(ps.toArray(new Predicate[0]));
        };

        List<AuditLog> logs = repository.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        return toResponses(logs);
    }

    @Transactional(readOnly = true)
    public AuditLogDto.Response findById(UUID id) {
        AuditLog log = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy nhật ký hệ thống"));
        return toResponses(List.of(log)).get(0);
    }

    private List<AuditLogDto.Response> toResponses(List<AuditLog> logs) {
        Set<UUID> userIds = logs.stream().map(AuditLog::getUserId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, User> users = userIds.isEmpty() ? Map.of() : userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
        return logs.stream().map(l -> {
            User u = l.getUserId() == null ? null : users.get(l.getUserId());
            return new AuditLogDto.Response(l.getLogId(), l.getUserId(), u == null ? null : u.getName(),
                    l.getAction(), l.getDetails(), l.getIpAddress(), l.getCreatedAt());
        }).toList();
    }
}
