package com.equiflow.controller;

import com.equiflow.dto.HorseRequest;
import com.equiflow.dto.HorseResponse;
import com.equiflow.dto.MessageResponse;
import com.equiflow.service.HorseService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Phân quyền theo vai trò được khai báo trong SecurityConfig;
 * quyền sở hữu (khách hàng chỉ sửa ngựa của mình) được kiểm tra trong HorseService.
 */
@RestController
@RequestMapping("/api/horses")
public class HorseController {

    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

    /** Thêm ngựa (multipart/form-data). image: ảnh JPG/PNG chọn từ máy, không bắt buộc. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<HorseResponse> create(
            @RequestParam("microchipId") String microchipId,
            @RequestParam("name") String name,
            @RequestParam("gender") String gender,
            @RequestParam(value = "pedigree", required = false) String pedigree,
            @RequestParam(value = "medicalHistory", required = false) String medicalHistory,
            @RequestParam(value = "allergies", required = false) String allergies,
            @RequestParam(value = "temperament", required = false) String temperament,
            @RequestParam(value = "ownerUserId", required = false) UUID ownerUserId,
            @RequestParam(value = "image", required = false) MultipartFile image,
            Authentication auth) {
        HorseRequest req = new HorseRequest(microchipId, name, gender, pedigree, medicalHistory, allergies,
                temperament, ownerUserId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(horseService.create(req, image, userId(auth), isCustomer(auth)));
    }

    @GetMapping
    public List<HorseResponse> getAll() {
        return horseService.findAll();
    }

    @GetMapping("/my-horses")
    public List<HorseResponse> myHorses(Authentication auth) {
        return horseService.findMine(userId(auth));
    }

    @GetMapping("/{id}")
    public HorseResponse getById(@PathVariable UUID id) {
        return horseService.findById(id);
    }

    /** Xem ảnh ngựa (cần gửi kèm JWT). */
    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> image(@PathVariable UUID id, Authentication auth) {
        return FileResponses.of(horseService.findImage(id, userId(auth), isCustomer(auth)));
    }

    /**
     * Cập nhật ngựa (multipart/form-data). Không gửi image thì giữ ảnh cũ; gửi image mới thì thay ảnh cũ.
     * Không gửi ownerUserId thì giữ nguyên chủ cũ (chỉ nhân viên đổi được chủ).
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public HorseResponse update(
            @PathVariable UUID id,
            @RequestParam("microchipId") String microchipId,
            @RequestParam("name") String name,
            @RequestParam("gender") String gender,
            @RequestParam(value = "pedigree", required = false) String pedigree,
            @RequestParam(value = "medicalHistory", required = false) String medicalHistory,
            @RequestParam(value = "allergies", required = false) String allergies,
            @RequestParam(value = "temperament", required = false) String temperament,
            @RequestParam(value = "ownerUserId", required = false) UUID ownerUserId,
            @RequestParam(value = "image", required = false) MultipartFile image,
            Authentication auth) {
        HorseRequest req = new HorseRequest(microchipId, name, gender, pedigree, medicalHistory, allergies,
                temperament, ownerUserId);
        return horseService.update(id, req, image, userId(auth), isCustomer(auth));
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id) {
        return horseService.delete(id);
    }

    private static UUID userId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private static boolean isCustomer(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"));
    }
}
