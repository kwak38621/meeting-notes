package com.meetingnotes.tag.dto;

import com.meetingnotes.tag.Tag;

public record TagResponse(Long id, String name) {
    public static TagResponse from(Tag tag) {
        return new TagResponse(tag.getId(), tag.getName());
    }
}
