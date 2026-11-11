package com.equiflow.controller;

import com.equiflow.dto.MessageResponse;
import com.equiflow.dto.ProfileDto;
import com.equiflow.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ProfileDto.Response getMyProfile(Authentication auth) {
        return profileService.getProfile((UUID) auth.getPrincipal());
    }

    @PutMapping("/me")
    public ProfileDto.Response updateMyProfile(
            @Valid @RequestBody ProfileDto.UpdateRequest req,
            Authentication auth) {
        return profileService.updateProfile((UUID) auth.getPrincipal(), req);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        return profileService.uploadAvatar((UUID) auth.getPrincipal(), file);
    }

    @DeleteMapping("/avatar")
    public ProfileDto.Response removeAvatar(Authentication auth) {
        return profileService.removeAvatar((UUID) auth.getPrincipal());
    }

    @PutMapping("/password")
    public MessageResponse changePassword(
            @Valid @RequestBody ProfileDto.ChangePasswordRequest req,
            Authentication auth) {
        profileService.changePassword((UUID) auth.getPrincipal(), req);
        return new MessageResponse("Đổi mật khẩu thành công");
    }
}
