package com.equiflow.service;

import com.equiflow.dto.HorseRequest;
import com.equiflow.dto.HorseResponse;
import com.equiflow.dto.MessageResponse;
import com.equiflow.entity.Horse;
import com.equiflow.entity.User;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class HorseService {

    private final HorseRepository horseRepository;
    private final UserRepository userRepository;

    public HorseService(HorseRepository horseRepository, UserRepository userRepository) {
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
    }

    // ================= CREATE (staff + customer) =================
    public HorseResponse create(HorseRequest req, UUID currentUserId, boolean customer) {
        String microchip = req.microchipId().trim();
        if (horseRepository.existsByMicrochipId(microchip)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã microchip đã tồn tại");
        }

        UUID ownerId;
        if (customer) {
            ownerId = currentUserId; // khách hàng luôn là chủ ngựa mình tạo, bỏ qua ownerUserId trong body
        } else {
            ownerId = req.ownerUserId();
            if (ownerId != null) {
                requireUser(ownerId);
            }
        }

        Horse horse = new Horse();
        apply(horse, req, microchip);
        horse.setOwnerUserId(ownerId);
        return toResponse(save(horse));
    }

    // ================= READ (staff) =================
    public List<HorseResponse> findAll() {
        return toResponses(horseRepository.findAllByOrderByCreatedAtDesc());
    }

    public HorseResponse findById(UUID id) {
        return toResponse(getOrThrow(id));
    }

    // ================= READ (customer) =================
    public List<HorseResponse> findMine(UUID userId) {
        return toResponses(horseRepository.findByOwnerUserIdOrderByCreatedAtDesc(userId));
    }

    // ================= UPDATE (staff + customer) =================
    public HorseResponse update(UUID id, HorseRequest req, UUID currentUserId, boolean customer) {
        Horse horse = getOrThrow(id);
        // khách hàng chỉ sửa được ngựa của mình; ngựa của người khác trả 404 như không tồn tại
        if (customer && !currentUserId.equals(horse.getOwnerUserId())) {
            throw notFound();
        }

        String microchip = req.microchipId().trim();
        if (horseRepository.existsByMicrochipIdAndHorseIdNot(microchip, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã microchip đã tồn tại");
        }

        apply(horse, req, microchip);
        // chỉ nhân viên được đổi chủ sở hữu; không gửi ownerUserId thì giữ nguyên chủ cũ
        if (!customer && req.ownerUserId() != null) {
            requireUser(req.ownerUserId());
            horse.setOwnerUserId(req.ownerUserId());
        }
        return toResponse(save(horse));
    }

    // ================= DELETE (staff) =================
    public MessageResponse delete(UUID id) {
        Horse horse = getOrThrow(id);
        try {
            horseRepository.delete(horse);
        } catch (DataIntegrityViolationException e) {
            // ngựa đã gắn với đơn vận chuyển / hồ sơ / kiểm dịch / nhật ký sức khỏe (khóa ngoại)
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể xóa ngựa vì đã có dữ liệu liên quan (đơn vận chuyển, hồ sơ, kiểm dịch hoặc nhật ký sức khỏe)");
        }
        return new MessageResponse("Xóa ngựa thành công");
    }

    // ================= helpers =================
    private Horse getOrThrow(UUID id) {
        return horseRepository.findById(id).orElseThrow(HorseService::notFound);
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy ngựa");
    }

    private void requireUser(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chủ sở hữu không tồn tại");
        }
    }

    private Horse save(Horse horse) {
        try {
            return horseRepository.saveAndFlush(horse);
        } catch (DataIntegrityViolationException e) {
            // 2 request cùng lúc vượt qua bước kiểm tra microchip ở trên
            throw new ApiException(HttpStatus.CONFLICT, "Mã microchip đã tồn tại");
        }
    }

    private void apply(Horse horse, HorseRequest req, String microchip) {
        horse.setMicrochipId(microchip);
        horse.setName(req.name().trim());
        horse.setGender(normalizeGender(req.gender()));
        horse.setPedigree(blankToNull(req.pedigree()));
        horse.setMedicalHistory(blankToNull(req.medicalHistory()));
        horse.setAllergies(blankToNull(req.allergies()));
        horse.setTemperament(blankToNull(req.temperament()));
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * Cột gender là VARCHAR(10), dữ liệu mẫu dùng Duc / Cai / Thien (không dấu).
     * Chấp nhận thêm "Đực/Cái/Thiến" có dấu và MALE/FEMALE/GELDING, rồi chuẩn hóa về 3 giá trị trên.
     */
    private static String normalizeGender(String raw) {
        String s = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd');
        return switch (s) {
            case "duc", "male", "stallion" -> "Duc";
            case "cai", "female", "mare" -> "Cai";
            case "thien", "gelding" -> "Thien";
            default -> throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Giới tính không hợp lệ (chấp nhận: Duc, Cai, Thien)");
        };
    }

    private HorseResponse toResponse(Horse h) {
        String ownerName = h.getOwnerUserId() == null ? null
                : userRepository.findById(h.getOwnerUserId()).map(User::getName).orElse(null);
        return build(h, ownerName);
    }

    private List<HorseResponse> toResponses(List<Horse> horses) {
        Set<UUID> ownerIds = horses.stream()
                .map(Horse::getOwnerUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> names = userRepository.findAllById(ownerIds).stream()
                .collect(Collectors.toMap(User::getUserId, User::getName));
        return horses.stream()
                .map(h -> build(h, h.getOwnerUserId() == null ? null : names.get(h.getOwnerUserId())))
                .toList();
    }

    private static HorseResponse build(Horse h, String ownerName) {
        return new HorseResponse(h.getHorseId(), h.getMicrochipId(), h.getName(), h.getGender(),
                h.getPedigree(), h.getMedicalHistory(), h.getAllergies(), h.getTemperament(),
                h.getOwnerUserId(), ownerName, h.getCreatedAt());
    }
}
