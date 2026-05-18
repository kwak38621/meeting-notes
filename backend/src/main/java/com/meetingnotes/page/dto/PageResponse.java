package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import com.meetingnotes.tag.dto.TagResponse;
import java.time.LocalDateTime;
import java.util.List;

public record PageResponse(
    Long id,
    String title,
    String content,
    Long parentId,
    String emoji,
    List<TagResponse> tags,
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
            page.getTags().stream().map(TagResponse::from).toList(),
            page.getCreatedAt(),
            page.getUpdatedAt()
        );
    }
}
