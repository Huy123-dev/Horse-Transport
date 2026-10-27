package com.equiflow.service;

import com.equiflow.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileStorageServiceTest {

    @TempDir
    Path tempDirectory;

    @Test
    void publicProofsAreStoredOutsideThePrivateDocumentDirectory() throws Exception {
        FileStorageService storage = new FileStorageService(tempDirectory.toString(), 10L * 1024 * 1024);
        storage.init();
        byte[] image = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};

        String privateKey = storage.store(new MockMultipartFile(
                "file", "horse.jpg", "image/jpeg", image));
        String publicKey = storage.storePublic(new MockMultipartFile(
                "file", "proof.jpg", "image/jpeg", image));

        assertArrayEquals(image, Files.readAllBytes(storage.load(privateKey)));
        assertArrayEquals(image, Files.readAllBytes(tempDirectory.resolve("public").resolve(publicKey)));
        assertThrows(ApiException.class, () -> storage.load(publicKey));
    }

    @Test
    void publicUploadRejectsDocumentFormatsOutsideTheProofAllowlist() {
        FileStorageService storage = new FileStorageService(tempDirectory.toString(), 10L * 1024 * 1024);

        assertThrows(ApiException.class, () -> storage.storePublic(new MockMultipartFile(
                "file", "document.docx", "application/octet-stream", new byte[]{0x50, 0x4B, 0x03, 0x04})));
    }

    @Test
    void horseImagesRequireMatchingMimeAndContentAndProduceAValidPublicUrl() {
        FileStorageService storage = new FileStorageService(tempDirectory.toString(), 10L * 1024 * 1024);
        storage.init();
        byte[] webp = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};

        String key = storage.storeHorseImage(new MockMultipartFile(
                "file", "horse.webp", "image/webp", webp));

        assertEquals("/uploads/" + key,
                storage.normalizePublicImageUrl("http://localhost:8080/uploads/" + key));
        assertThrows(ApiException.class,
                () -> storage.normalizePublicImageUrl("https://example.invalid/uploads/" + key + "?tracking=1"));
        assertThrows(ApiException.class, () -> storage.storeHorseImage(new MockMultipartFile(
                "file", "horse.png", "image/jpeg", webp)));
        assertThrows(ApiException.class, () -> storage.storeHorseImage(new MockMultipartFile(
                "file", "horse.webp", "image/webp", new byte[]{'n', 'o', 't', 'a', 'n', 'i', 'm', 'a', 'g', 'e', '!', '!'})));
    }

    @Test
    void horseImageUploadEnforcesTheConfiguredSizeLimit() {
        FileStorageService storage = new FileStorageService(tempDirectory.toString(), 3);
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};

        assertThrows(ApiException.class, () -> storage.storeHorseImage(new MockMultipartFile(
                "file", "horse.jpg", "image/jpeg", jpeg)));
    }
}
