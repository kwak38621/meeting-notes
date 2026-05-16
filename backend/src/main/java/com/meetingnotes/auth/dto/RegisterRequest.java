package com.meetingnotes.auth.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password,
    @NotBlank @Size(max = 100) String name
) {}
