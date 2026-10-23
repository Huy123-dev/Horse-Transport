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
import org.springframework.web.multipart.MultipartFile;

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
    private final FileStorageService storage;

    public HorseService(HorseRepository horseRepository, UserRepository userRepository, FileStorageService storage) {
        this.horseRepository = horseRepository;
        this.userRepository = userRepository;
        this.storage = storage;
    }

    // ================= CREATE (staff + customer) =================
    /** image có thể null: ngựa chưa có ảnh. */
    public HorseResponse create(HorseRequest req, MultipartFile image, UUID currentUserId, boolean customer) {
        validate(req);
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

        String imageKey = hasFile(image) ? storage.storeImage(image) : null; // lưu file sau khi mọi kiểm tra đã qua
        try {
            horse.setImageUrl(imageKey);
            return toResponse(save(horse));
        } catch (RuntimeException e) {
            if (imageKey != null) storage.delete(imageKey);
            throw e;
        }
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
    /** image có thể null: giữ ảnh cũ. Có image: thay ảnh cũ bằng ảnh mới. */
    public HorseResponse update(UUID id, HorseRequest req, MultipartFile image, UUID currentUserId, boolean customer) {
        validate(req);
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

        String oldKey = horse.getImageUrl();
        String newKey = hasFile(image) ? storage.storeImage(image) : null;
        HorseResponse response;
        try {
            if (newKey != null) horse.setImageUrl(newKey);
            response = toResponse(save(horse));
        } catch (RuntimeException e) {
            if (newKey != null) storage.delete(newKey);
            throw e;
        }
        if (newKey != null && oldKey != null) storage.delete(oldKey);
        return response;
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
        if (horse.getImageUrl() != null) storage.delete(horse.getImageUrl());
        return new MessageResponse("Xóa ngựa thành công");
    }

    // ================= IMAGE =================
    /** Xem ảnh ngựa. Customer chỉ xem được ảnh ngựa của mình; ngựa người khác trả 404 như không tồn tại. */
    public FileStorageService.StoredFile findImage(UUID id, UUID currentUserId, boolean customer) {
        Horse horse = getOrThrow(id);
        if (customer && !currentUserId.equals(horse.getOwnerUserId())) {
            throw notFound();
        }
        if (horse.getImageUrl() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Ngựa chưa có ảnh");
        }
        return storage.open(horse.getImageUrl());
    }

    // ================= helpers =================
    /** multipart không đi qua @Valid nên kiểm tra thủ công, cùng quy tắc với HorseRequest. */
    private static void validate(HorseRequest req) {
        requireText(req.microchipId(), 50, "Vui lòng nhập mã microchip", "Mã microchip tối đa 50 ký tự");
        requireText(req.name(), 100, "Vui lòng nhập tên ngựa", "Tên ngựa tối đa 100 ký tự");
        requireText(req.gender(), 20, "Vui lòng chọn giới tính", "Giới tính không hợp lệ");
    }

    private static void requireText(String value, int max, String blankMessage, String tooLongMessage) {
        if (value == null || value.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, blankMessage);
        if (value.trim().length() > max) throw new ApiException(HttpStatus.BAD_REQUEST, tooLongMessage);
    }

    private static boolean hasFile(MultipartFile f) {
        return f != null && !f.isEmpty();
    }

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
                h.getOwnerUserId(), ownerName, h.getCreatedAt(),
                h.getImageUrl() == null ? null : "/api/horses/" + h.getHorseId() + "/image");
    }
}
