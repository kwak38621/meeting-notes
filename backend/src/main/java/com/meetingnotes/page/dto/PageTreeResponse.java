package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import java.util.List;

// 페이지 트리 응답 DTO에 즐겨찾기 필드 노출
public record PageTreeResponse(
    Long id,
    String title,
    String emoji,
    boolean favorite,
    List<PageTreeResponse> children
) {
    public static PageTreeResponse from(Page page) {
        return new PageTreeResponse(
            page.getId(),
            page.getTitle(),
            page.getEmoji(),
            page.isFavorite(),
            page.getChildren().stream().map(PageTreeResponse::from).toList()
        );
    }
}
