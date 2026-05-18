package com.meetingnotes.page.dto;

import jakarta.validation.constraints.*;

public record PageRequest(
    @NotBlank @Size(max = 500) String title,
    String content,
    Long parentId,
    String emoji
) {}
