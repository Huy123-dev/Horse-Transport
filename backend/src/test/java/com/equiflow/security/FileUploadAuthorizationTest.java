package com.equiflow.security;

import com.equiflow.config.WebMvcConfig;
import com.equiflow.controller.FileUploadController;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FileUploadController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, WebMvcConfig.class})
class FileUploadAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private FileStorageService fileStorageService;

    @Test
    void driverCanUploadAndReceivesPublicUrl() throws Exception {
        when(fileStorageService.storePublic(any())).thenReturn("proof.jpg");
        MockMultipartFile file = new MockMultipartFile(
                "file", "proof.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});

        mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .with(user("driver").roles("DRIVER_ESCORT")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("http://localhost/uploads/proof.jpg"));

        verify(fileStorageService).storePublic(any());
    }

    @Test
    void unapprovedRoleCannotUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "proof.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});

        mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .with(user("coordinator").roles("FLEET_COORDINATOR")))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCanUploadHorseImage() throws Exception {
        when(fileStorageService.storeHorseImage(any())).thenReturn("horse.jpg");
        MockMultipartFile file = new MockMultipartFile(
                "file", "horse.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});

        mockMvc.perform(multipart("/api/horses/images")
                        .file(file)
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("http://localhost/uploads/horse.jpg"));

        verify(fileStorageService).storeHorseImage(any());
    }

    @Test
    void driverCannotUploadHorseProfileImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "horse.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});

        mockMvc.perform(multipart("/api/horses/images")
                        .file(file)
                        .with(user("driver").roles("DRIVER_ESCORT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void uploadsGetIsPublic() throws Exception {
        mockMvc.perform(get("/uploads/not-found.jpg"))
                .andExpect(status().isNotFound());
    }
}
