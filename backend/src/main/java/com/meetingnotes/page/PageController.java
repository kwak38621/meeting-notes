package com.meetingnotes.page;

import com.meetingnotes.common.ApiResponse;
import com.meetingnotes.page.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PageTreeResponse>>> getTree(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.getTree(user.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PageResponse>> create(
            @Valid @RequestBody PageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.create(req, user.getUsername())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PageResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.get(id, user.getUsername())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PageResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody PageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.update(id, req, user.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        pageService.delete(id, user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<PageResponse>>> search(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.search(q, user.getUsername())));
    }

    @PostMapping("/{pageId}/tags/{tagId}")
    public ResponseEntity<ApiResponse<PageResponse>> addTag(
            @PathVariable Long pageId, @PathVariable Long tagId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.addTag(pageId, tagId, user.getUsername())));
    }

    @DeleteMapping("/{pageId}/tags/{tagId}")
    public ResponseEntity<ApiResponse<PageResponse>> removeTag(
            @PathVariable Long pageId, @PathVariable Long tagId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.removeTag(pageId, tagId, user.getUsername())));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<ApiResponse<PageResponse>> move(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.move(id, body.get("parentId"), user.getUsername())));
    }

    // 즐겨찾기 토글 (body: {favorite: boolean})
    @PatchMapping("/{id}/favorite")
    public ResponseEntity<ApiResponse<PageResponse>> toggleFavorite(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails user) {
        boolean value = Boolean.TRUE.equals(body.get("favorite"));
        return ResponseEntity.ok(ApiResponse.ok(pageService.toggleFavorite(id, value, user.getUsername())));
    }

    // 사용자의 즐겨찾기 페이지 목록
    @GetMapping("/favorites")
    public ResponseEntity<ApiResponse<List<PageResponse>>> getFavorites(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.getFavorites(user.getUsername())));
    }
}
