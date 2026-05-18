package com.meetingnotes.tag.dto;

import jakarta.validation.constraints.*;

public record TagRequest(@NotBlank @Size(max = 50) String name) {}
