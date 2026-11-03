package com.equiflow.service;

import com.equiflow.exception.ApiException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Lưu file hồ sơ lên ổ đĩa của máy chủ (thư mục app.upload.dir).
 * Cột file_url trong DB lưu "khóa file" dạng {uuid}_{tên-gốc}.{đuôi}; không bao giờ lưu đường dẫn ổ đĩa.
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private static final int MAX_NAME_LENGTH = 100;

    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "pdf", "application/pdf",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    private final Path root;
    private final Path publicRoot;
    private final long maxSizeBytes;

    public FileStorageService(
            @Value("${app.upload.dir:uploads}") String uploadDir,
            @Value("${app.upload.max-file-size-bytes:10485760}") long maxSizeBytes) {
        if (maxSizeBytes <= 0) throw new IllegalArgumentException("app.upload.max-file-size-bytes must be positive");
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicRoot = root.resolve("public").normalize();
        this.maxSizeBytes = maxSizeBytes;
    }

    @PostConstruct
    void init() {
        try {
            Files.createDirectories(root);
            Files.createDirectories(publicRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Không tạo được thư mục upload: " + root, e);
        }
    }

    /** Kiểm tra rồi lưu file, trả về khóa file để ghi vào file_url. */
    public String store(MultipartFile file) {
        return store(file, root);
    }

    /** Lưu ảnh/PDF chứng từ công khai trong thư mục riêng, không trộn với hồ sơ ngựa riêng tư. */
    public String storePublic(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng chọn file để tải lên");
        }
        String ext = extensionOf(cleanName(file.getOriginalFilename()));
        if (!Set.of("pdf", "jpg", "jpeg", "png").contains(ext)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận ảnh JPG/PNG hoặc PDF");
        }
        return store(file, publicRoot);
    }

    public String storeHorseImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ảnh ngựa để tải lên");
        }
        String name = cleanName(file.getOriginalFilename());
        String extension = extensionOf(name);
        String expectedContentType = CONTENT_TYPES.get(extension);
        if (!Set.of("jpg", "jpeg", "png", "webp").contains(extension)
                || !expectedContentType.equalsIgnoreCase(file.getContentType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ảnh ngựa phải có định dạng JPG, PNG hoặc WebP hợp lệ");
        }
        return store(file, publicRoot);
    }

    private String store(MultipartFile file, Path destination) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng chọn file để tải lên");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "File vượt quá giới hạn dung lượng cho phép");
        }
        String name = cleanName(file.getOriginalFilename());
        String ext = extensionOf(name);
        if (!CONTENT_TYPES.containsKey(ext)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận file PDF, JPG, PNG, DOC, DOCX");
        }

        try (InputStream in = file.getInputStream()) {
            if (!matchesSignature(ext, in.readNBytes(12))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Nội dung file không đúng định dạng ." + ext);
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được file tải lên");
        }

        String key = UUID.randomUUID() + "_" + name;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, resolve(destination, key));
        } catch (IOException e) {
            log.error("Không lưu được file {}", key, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu file, vui lòng thử lại");
        }
        return key;
    }

    /** Trả về đường dẫn file trên ổ đĩa, hoặc 404 nếu file không còn tồn tại. */
    public Path load(String key) {
        Path p = resolve(root, key);
        if (!Files.isRegularFile(p)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy file trên máy chủ");
        }
        return p;
    }

    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(root, key));
        } catch (IOException | ApiException e) {
            log.warn("Không xóa được file {}", key, e);
        }
    }

    /** true nếu file_url là khóa file do hệ thống lưu; false nếu là liên kết ngoài (dữ liệu cũ dạng https://...). */
    public boolean isStoredKey(String fileUrl) {
        return fileUrl != null && !fileUrl.startsWith("http://") && !fileUrl.startsWith("https://");
    }

    /** Tên file gốc người dùng đã chọn (bỏ phần uuid phía trước). */
    public String originalName(String key) {
        int i = key.indexOf('_');
        return i >= 0 ? key.substring(i + 1) : key;
    }

    public String contentType(String key) {
        return CONTENT_TYPES.getOrDefault(extensionOf(key), "application/octet-stream");
    }

    public String normalizePublicImageUrl(String value) {
        if (value == null || value.isBlank()) throw invalidPublicImageUrl();
        final URI uri;
        try {
            uri = URI.create(value);
        } catch (IllegalArgumentException e) {
            throw invalidPublicImageUrl();
        }
        if ((uri.getScheme() != null && !Set.of("http", "https").contains(uri.getScheme().toLowerCase(Locale.ROOT)))
                || (uri.getScheme() != null && uri.getHost() == null)
                || uri.getRawUserInfo() != null
                || uri.getRawQuery() != null
                || uri.getRawFragment() != null) {
            throw invalidPublicImageUrl();
        }

        String path = uri.getPath();
        if (path == null || !path.startsWith("/uploads/")) throw invalidPublicImageUrl();
        String key = path.substring("/uploads/".length());
        if (key.isBlank() || key.contains("/") || !Set.of("jpg", "jpeg", "png", "webp").contains(extensionOf(key))) {
            throw invalidPublicImageUrl();
        }
        if (!Files.isRegularFile(resolve(publicRoot, key))) throw invalidPublicImageUrl();
        return path;
    }

    private static ApiException invalidPublicImageUrl() {
        return new ApiException(HttpStatus.BAD_REQUEST, "Ảnh ngựa phải được tải lên hệ thống trước khi lưu hồ sơ");
    }

    private static Path resolve(Path directory, String key) {
        Path p = directory.resolve(key).normalize();
        if (!p.startsWith(directory)) { // chặn path traversal
            throw new ApiException(HttpStatus.BAD_REQUEST, "Đường dẫn file không hợp lệ");
        }
        return p;
    }

    private static String cleanName(String original) {
        String n = original == null ? "" : original;
        n = n.substring(Math.max(n.lastIndexOf('/'), n.lastIndexOf('\\')) + 1); // bỏ phần thư mục nếu có
        n = n.replaceAll("[^\\p{L}\\p{N}._-]", "_");
        if (n.length() > MAX_NAME_LENGTH) {
            String ext = extensionOf(n);
            String suffix = ext.isEmpty() ? "" : "." + ext;
            n = n.substring(0, Math.max(1, MAX_NAME_LENGTH - suffix.length())) + suffix;
        }
        return n.isBlank() ? "file" : n;
    }

    private static String extensionOf(String name) {
        int i = name.lastIndexOf('.');
        return i < 0 ? "" : name.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    /** Đối chiếu vài byte đầu để tránh đổi đuôi file bừa (ví dụ đổi .exe thành .pdf). */
    private static boolean matchesSignature(String ext, byte[] h) {
        return switch (ext) {
            case "pdf" -> startsWith(h, 0x25, 0x50, 0x44, 0x46);
            case "png" -> startsWith(h, 0x89, 0x50, 0x4E, 0x47);
            case "jpg", "jpeg" -> startsWith(h, 0xFF, 0xD8, 0xFF);
            case "webp" -> h.length >= 12
                    && startsWith(h, 0x52, 0x49, 0x46, 0x46)
                    && h[8] == 0x57 && h[9] == 0x45 && h[10] == 0x42 && h[11] == 0x50;
            case "docx" -> startsWith(h, 0x50, 0x4B, 0x03, 0x04);
            case "doc" -> startsWith(h, 0xD0, 0xCF, 0x11, 0xE0);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] h, int... sig) {
        if (h.length < sig.length) return false;
        for (int i = 0; i < sig.length; i++) {
            if ((h[i] & 0xFF) != sig[i]) return false;
        }
        return true;
    }
}
