package com.equiflow.service;

import com.equiflow.dto.CustomsRegulationDto;
import com.equiflow.dto.MessageResponse;
import com.equiflow.entity.CustomsRegulation;
import com.equiflow.entity.Location;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.CustomsRegulationRepository;
import com.equiflow.repository.LocationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.equiflow.service.StatusSupport.blankToNull;

@Service
public class CustomsRegulationService {

    private static final Set<String> TYPES = Set.of("IMPORT", "EXPORT");

    private final CustomsRegulationRepository repository;
    private final LocationRepository locationRepository;

    public CustomsRegulationService(CustomsRegulationRepository repository, LocationRepository locationRepository) {
        this.repository = repository;
        this.locationRepository = locationRepository;
    }

    /** ?countryCode=JPN để lọc theo quốc gia; không truyền thì lấy tất cả. */
    public List<CustomsRegulationDto.Response> findAll(String countryCode) {
        List<CustomsRegulation> list;
        if (countryCode == null || countryCode.isBlank()) {
            list = repository.findAllByOrderByCountryCodeAscImportExportTypeAsc();
        } else {
            list = repository.findByCountryCodeOrderByImportExportTypeAsc(countryCode.trim().toUpperCase(Locale.ROOT));
        }
        return toResponses(list);
    }

    public CustomsRegulationDto.Response findById(UUID id) {
        return toResponses(List.of(getOrThrow(id))).get(0);
    }

    public CustomsRegulationDto.Response create(CustomsRegulationDto.Request req) {
        CustomsRegulation r = new CustomsRegulation();
        apply(r, req);
        return toResponses(List.of(repository.save(r))).get(0);
    }

    public CustomsRegulationDto.Response update(UUID id, CustomsRegulationDto.Request req) {
        CustomsRegulation r = getOrThrow(id);
        apply(r, req);
        return toResponses(List.of(repository.save(r))).get(0);
    }

    /** Hiện chưa có bảng nào tham chiếu tới quy định, nên xóa trực tiếp. */
    public MessageResponse delete(UUID id) {
        repository.delete(getOrThrow(id));
        return new MessageResponse("Đã xóa quy định");
    }

    private CustomsRegulation getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy quy định hải quan"));
    }

    private void apply(CustomsRegulation r, CustomsRegulationDto.Request req) {
        String type = req.importExportType().trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Loại quy định không hợp lệ (chấp nhận: IMPORT, EXPORT)");
        }
        if (req.portLocationId() != null && !locationRepository.existsById(req.portLocationId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cảng/sân bay không tồn tại");
        }
        r.setCountryCode(req.countryCode().trim().toUpperCase(Locale.ROOT));
        r.setPortLocationId(req.portLocationId());
        r.setQuarantineStandard(blankToNull(req.quarantineStandard()));
        r.setRequiredDocuments(blankToNull(req.requiredDocuments()));
        r.setImportExportType(type);
    }

    private List<CustomsRegulationDto.Response> toResponses(List<CustomsRegulation> list) {
        Set<UUID> ids = list.stream().map(CustomsRegulation::getPortLocationId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, Location> locations = locationRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Location::getLocationId, Function.identity()));
        return list.stream().map(r -> {
            Location l = r.getPortLocationId() == null ? null : locations.get(r.getPortLocationId());
            return new CustomsRegulationDto.Response(r.getRegulationId(), r.getCountryCode(), r.getPortLocationId(),
                    l == null ? null : l.getName(), r.getQuarantineStandard(), r.getRequiredDocuments(),
                    r.getImportExportType());
        }).toList();
    }
}
