package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import java.util.List;

public record PageTreeResponse(
    Long id,
    String title,
    String emoji,
    List<PageTreeResponse> children
) {
    public static PageTreeResponse from(Page page) {
        return new PageTreeResponse(
            page.getId(),
            page.getTitle(),
            page.getEmoji(),
            page.getChildren().stream().map(PageTreeResponse::from).toList()
        );
    }
}
