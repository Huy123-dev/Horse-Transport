package com.equiflow.dto;

public record AuthResponse(String accessToken, String tokenType, long expiresInMs, UserInfo user) {}
