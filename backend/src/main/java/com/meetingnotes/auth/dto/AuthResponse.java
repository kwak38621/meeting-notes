package com.meetingnotes.auth.dto;

public record AuthResponse(String accessToken, String refreshToken, String name) {}
