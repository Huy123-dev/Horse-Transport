package com.equiflow.service;

import com.equiflow.dto.HorseDocumentResponse;
import com.equiflow.dto.MessageResponse;
import com.equiflow.entity.Horse;
import com.equiflow.entity.HorseDocument;
import com.equiflow.entity.TransportRequest;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.HorseDocumentRepository;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class HorseDocumentService {

    /** Dữ liệu để controller trả file về cho client. */
    public record FileDownload(Resource resource, String fileName, String contentType) {}

    private final HorseDocumentRepository documentRepository;
    private final HorseRepository horseRepository;
    private final TransportRequestRepository requestRepository;
    private final FileStorageService storage;

    public HorseDocumentService(HorseDocumentRepository documentRepository,
                                HorseRepository horseRepository,
                                TransportRequestRepository requestRepository,
                                FileStorageService storage) {
        this.documentRepository = documentRepository;
        this.horseRepository = horseRepository;
        this.requestRepository = requestRepository;
        this.storage = storage;
    }

    // ================= CREATE =================
    @Transactional
    public HorseDocumentResponse create(UUID horseId, String documentType, LocalDate expiryDate, UUID requestId,
                                        MultipartFile file, UUID currentUserId, boolean customer) {
        Horse horse = requireHorse(horseId, currentUserId, customer);
        String type = cleanType(documentType);
        UUID linkedRequestId = resolveRequestId(requestId, horse, currentUserId, customer);

        String key = storage.store(file); // lưu file sau khi mọi kiểm tra đã qua, tránh để lại file mồ côi
        try {
            HorseDocument d = new HorseDocument();
            d.setHorseId(horseId);
            d.setDocumentType(type);
            d.setFileUrl(key);
            d.setExpiryDate(expiryDate);
            d.setRequestId(linkedRequestId);
            return toResponse(documentRepository.saveAndFlush(d), horse.getName());
        } catch (RuntimeException e) {
            storage.delete(key);
            throw e;
        }
    }

    // ================= READ =================
    @Transactional(readOnly = true)
    public List<HorseDocumentResponse> findByHorse(UUID horseId, UUID currentUserId, boolean customer) {
        Horse horse = requireHorse(horseId, currentUserId, customer);
        return documentRepository.findByHorseIdOrderByUploadedAtDesc(horseId).stream()
                .map(d -> toResponse(d, horse.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public HorseDocumentResponse findById(UUID id, UUID currentUserId, boolean customer) {
        HorseDocument d = getOrThrow(id);
        Horse horse = requireHorse(d.getHorseId(), currentUserId, customer);
        return toResponse(d, horse.getName());
    }

    /** Tải/xem file của hồ sơ (cùng quy tắc quyền như xem chi tiết). */
    @Transactional(readOnly = true)
    public FileDownload download(UUID id, UUID currentUserId, boolean customer) {
        HorseDocument d = getOrThrow(id);
        requireHorse(d.getHorseId(), currentUserId, customer);
        String key = d.getFileUrl();
        if (!storage.isStoredKey(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Hồ sơ này là liên kết ngoài, hãy mở trực tiếp fileUrl");
        }
        return new FileDownload(new FileSystemResource(storage.load(key)),
                storage.originalName(key), storage.contentType(key));
    }

    // ================= UPDATE =================
    /** file có thể null: chỉ cập nhật thông tin. Có file: thay file cũ bằng file mới. */
    @Transactional
    public HorseDocumentResponse update(UUID id, String documentType, LocalDate expiryDate, UUID requestId,
                                        MultipartFile file, UUID currentUserId, boolean customer) {
        HorseDocument d = getOrThrow(id);
        Horse horse = requireHorse(d.getHorseId(), currentUserId, customer);
        requireModifiable(d, customer);
        String type = cleanType(documentType);
        UUID linkedRequestId = resolveRequestId(requestId, horse, currentUserId, customer);

        String oldKey = d.getFileUrl();
        String newKey = (file != null && !file.isEmpty()) ? storage.store(file) : null;
        HorseDocument saved;
        try {
            d.setDocumentType(type);
            d.setExpiryDate(expiryDate);
            d.setRequestId(linkedRequestId);
            if (newKey != null) d.setFileUrl(newKey);
            saved = documentRepository.saveAndFlush(d);
        } catch (RuntimeException e) {
            if (newKey != null) storage.delete(newKey);
            throw e;
        }
        if (newKey != null && storage.isStoredKey(oldKey)) {
            storage.delete(oldKey);
        }
        return toResponse(saved, horse.getName());
    }

    // ================= DELETE =================
    @Transactional
    public MessageResponse delete(UUID id, UUID currentUserId, boolean customer) {
        HorseDocument d = getOrThrow(id);
        requireHorse(d.getHorseId(), currentUserId, customer);
        requireModifiable(d, customer);
        documentRepository.delete(d);
        documentRepository.flush();
        if (storage.isStoredKey(d.getFileUrl())) {
            storage.delete(d.getFileUrl());
        }
        return new MessageResponse("Xóa hồ sơ thành công");
    }

    // ================= helpers =================
    private HorseDocument getOrThrow(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ"));
    }

    /** Customer chỉ thao tác được với ngựa của mình; ngựa người khác trả 404 như không tồn tại. */
    private Horse requireHorse(UUID horseId, UUID currentUserId, boolean customer) {
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy ngựa"));
        if (customer && !currentUserId.equals(horse.getOwnerUserId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy ngựa");
        }
        return horse;
    }

    /**
     * Customer không được sửa/xóa hồ sơ đã gắn với yêu cầu vận chuyển đã phê duyệt
     * (hồ sơ đã dùng để thẩm định). Nhân viên không bị giới hạn.
     */
    private void requireModifiable(HorseDocument d, boolean customer) {
        if (!customer || d.getRequestId() == null) return;
        TransportRequest r = requestRepository.findById(d.getRequestId()).orElse(null);
        if (r != null && TransportRequestService.APPROVED.equals(r.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Hồ sơ thuộc yêu cầu vận chuyển đã được phê duyệt, vui lòng liên hệ nhân viên để thay đổi");
        }
    }

    /** Kiểm tra requestId (nếu có): yêu cầu phải tồn tại, của chính customer, và có chứa con ngựa này. */
    private UUID resolveRequestId(UUID requestId, Horse horse, UUID currentUserId, boolean customer) {
        if (requestId == null) return null;
        TransportRequest r = requestRepository.findById(requestId).orElse(null);
        if (r == null || (customer && !currentUserId.equals(r.getCustomerId()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu vận chuyển không tồn tại");
        }
        if (!r.getHorseIds().contains(horse.getHorseId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngựa này không thuộc yêu cầu vận chuyển đã chọn");
        }
        return requestId;
    }

    private static String cleanType(String documentType) {
        String t = documentType == null ? "" : documentType.trim();
        if (t.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng nhập loại hồ sơ");
        }
        if (t.length() > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Loại hồ sơ tối đa 100 ký tự");
        }
        return t;
    }

    private HorseDocumentResponse toResponse(HorseDocument d, String horseName) {
        boolean expired = d.getExpiryDate() != null && d.getExpiryDate().isBefore(LocalDate.now(ZoneOffset.UTC));
        boolean stored = storage.isStoredKey(d.getFileUrl());
        String fileUrl = stored ? "/api/documents/" + d.getDocumentId() + "/file" : d.getFileUrl();
        String fileName = stored ? storage.originalName(d.getFileUrl()) : null;
        return new HorseDocumentResponse(d.getDocumentId(), d.getHorseId(), horseName, d.getRequestId(),
                d.getDocumentType(), fileUrl, fileName, d.getExpiryDate(), expired, d.getUploadedAt());
    }
}
