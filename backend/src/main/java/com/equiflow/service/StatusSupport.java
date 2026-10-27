package com.equiflow.service;

import com.equiflow.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

/** Chuẩn hóa trạng thái client gửi lên (có/không dấu, PENDING/pending...) về giá trị lưu trong DB. */
final class StatusSupport {

    private StatusSupport() {}

    static String key(String raw) {
        return Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replace('_', ' ');
    }

    /** Bắt buộc có giá trị hợp lệ. */
    static String normalize(String raw, Map<String, String> aliases, String allowedHint) {
        String v = (raw == null || raw.isBlank()) ? null : aliases.get(key(raw));
        if (v == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ (chấp nhận: " + allowedHint + ")");
        }
        return v;
    }

    /** Dùng cho tham số lọc ?status= : để trống thì không lọc. */
    static String normalizeOrNull(String raw, Map<String, String> aliases, String allowedHint) {
        return (raw == null || raw.isBlank()) ? null : normalize(raw, aliases, allowedHint);
    }

    static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
