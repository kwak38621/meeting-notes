package com.meetingnotes.tag;

import com.meetingnotes.tag.dto.*;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public TagResponse create(TagRequest req, String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        if (tagRepository.findByNameAndUserId(req.name(), user.getId()).isPresent()) {
            throw new IllegalStateException("이미 존재하는 태그입니다.");
        }
        Tag tag = Tag.builder().name(req.name()).user(user).build();
        return TagResponse.from(tagRepository.save(tag));
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getAll(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return tagRepository.findByUserId(user.getId()).stream().map(TagResponse::from).toList();
    }

    public void delete(Long id, String email) {
        Tag tag = tagRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없습니다."));
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        if (!tag.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
        tagRepository.delete(tag);
    }
}
