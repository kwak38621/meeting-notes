package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import java.time.LocalDateTime;

public record PageResponse(
    Long id,
    String title,
    String content,
    Long parentId,
    String emoji,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static PageResponse from(Page page) {
        return new PageResponse(
            page.getId(),
            page.getTitle(),
            page.getContent(),
            page.getParent() != null ? page.getParent().getId() : null,
            page.getEmoji(),
            page.getCreatedAt(),
            page.getUpdatedAt()
        );
    }
}
