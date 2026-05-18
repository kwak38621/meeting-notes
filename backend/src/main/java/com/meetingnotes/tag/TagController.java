package com.meetingnotes.tag;

import com.meetingnotes.common.ApiResponse;
import com.meetingnotes.tag.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagResponse>>> getAll(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.getAll(user.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TagResponse>> create(
            @Valid @RequestBody TagRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.create(req, user.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        tagService.delete(id, user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
