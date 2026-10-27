package com.equiflow.service;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.TransportAssetDto;
import com.equiflow.entity.Partner;
import com.equiflow.entity.TransportAsset;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.PartnerRepository;
import com.equiflow.repository.TransportAssetRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

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
public class TransportAssetService {

    public static final String AVAILABLE = "San sang su dung";
    public static final String IN_USE = "Dang van hanh";
    public static final String MAINTENANCE = "Bao tri";

    private static final Map<String, String> STATUS_ALIASES = Map.ofEntries(
            Map.entry("san sang su dung", AVAILABLE), Map.entry("available", AVAILABLE),
            Map.entry("dang van hanh", IN_USE), Map.entry("in use", IN_USE),
            Map.entry("bao tri", MAINTENANCE), Map.entry("maintenance", MAINTENANCE));
    private static final String STATUS_HINT = "AVAILABLE, IN_USE, MAINTENANCE";

    private final TransportAssetRepository repository;
    private final TransportAssignmentRepository assignmentRepository;
    private final PartnerRepository partnerRepository;

    public TransportAssetService(TransportAssetRepository repository,
                                 TransportAssignmentRepository assignmentRepository,
                                 PartnerRepository partnerRepository) {
        this.repository = repository;
        this.assignmentRepository = assignmentRepository;
        this.partnerRepository = partnerRepository;
    }

    /** Lọc tùy chọn ?status= và ?type= */
    public List<TransportAssetDto.Response> findAll(String status, String type) {
        String st = StatusSupport.normalizeOrNull(status, STATUS_ALIASES, STATUS_HINT);
        String tp = blankToNull(type);
        List<TransportAsset> list = repository.findAllByOrderByNameAsc().stream()
                .filter(a -> st == null || st.equals(a.getStatus()))
                .filter(a -> tp == null || tp.equalsIgnoreCase(a.getType()))
                .toList();
        return toResponses(list);
    }

    public TransportAssetDto.Response findById(UUID id) {
        return toResponses(List.of(getOrThrow(id))).get(0);
    }

    public TransportAssetDto.Response create(TransportAssetDto.Request req) {
        TransportAsset a = new TransportAsset();
        apply(a, req);
        return toResponses(List.of(repository.save(a))).get(0);
    }

    public TransportAssetDto.Response update(UUID id, TransportAssetDto.Request req) {
        TransportAsset a = getOrThrow(id);
        apply(a, req);
        return toResponses(List.of(repository.save(a))).get(0);
    }

    /** Không xóa được phương tiện đã từng được phân công; hãy chuyển sang trạng thái bảo trì. */
    public MessageResponse delete(UUID id) {
        TransportAsset a = getOrThrow(id);
        if (assignmentRepository.existsByAssetId(id)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Phương tiện đã có phân công, không thể xóa (hãy chuyển sang trạng thái MAINTENANCE)");
        }
        repository.delete(a);
        return new MessageResponse("Đã xóa phương tiện");
    }

    private TransportAsset getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phương tiện"));
    }

    private void apply(TransportAsset a, TransportAssetDto.Request req) {
        if (req.ownerPartnerId() != null && !partnerRepository.existsById(req.ownerPartnerId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Đối tác sở hữu không tồn tại");
        }
        a.setName(req.name().trim());
        a.setType(req.type().trim().toUpperCase(Locale.ROOT));
        a.setCapacity(req.capacity());
        a.setOwnerPartnerId(req.ownerPartnerId());
        a.setStatus(req.status() == null || req.status().isBlank()
                ? AVAILABLE : StatusSupport.normalize(req.status(), STATUS_ALIASES, STATUS_HINT));
    }

    private List<TransportAssetDto.Response> toResponses(List<TransportAsset> list) {
        Set<UUID> ids = list.stream().map(TransportAsset::getOwnerPartnerId).filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Partner> partners = partnerRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Partner::getPartnerId, Function.identity()));
        return list.stream().map(a -> {
            Partner p = a.getOwnerPartnerId() == null ? null : partners.get(a.getOwnerPartnerId());
            return new TransportAssetDto.Response(a.getAssetId(), a.getName(), a.getType(), a.getCapacity(),
                    a.getOwnerPartnerId(), p == null ? null : p.getName(), a.getStatus());
        }).toList();
    }
}
