package com.meetingnotes.page;

import com.meetingnotes.page.dto.*;
import com.meetingnotes.tag.Tag;
import com.meetingnotes.tag.TagRepository;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PageService {

    private final PageRepository pageRepository;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;

    public PageResponse create(PageRequest req, String email) {
        User user = getUser(email);
        Page parent = req.parentId() != null
            ? pageRepository.findById(req.parentId()).orElseThrow(() -> new IllegalArgumentException("부모 페이지를 찾을 수 없습니다."))
            : null;
        if (parent != null && !parent.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
        Page page = Page.builder()
            .title(req.title())
            .content(req.content() != null ? req.content() : "")
            .user(user)
            .parent(parent)
            .emoji(req.emoji() != null ? req.emoji() : "📄")
            .sortOrder(0)
            .build();
        return PageResponse.from(pageRepository.save(page));
    }

    @Transactional(readOnly = true)
    public List<PageTreeResponse> getTree(String email) {
        User user = getUser(email);
        return pageRepository.findByUserIdAndParentIsNullOrderBySortOrderAsc(user.getId())
            .stream().map(PageTreeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse get(Long id, String email) {
        Page page = getPageOwned(id, email);
        return PageResponse.from(page);
    }

    public PageResponse update(Long id, PageRequest req, String email) {
        Page page = getPageOwned(id, email);
        page.update(req.title(), req.content(), req.emoji());
        return PageResponse.from(page);
    }

    public void delete(Long id, String email) {
        Page page = getPageOwned(id, email);
        pageRepository.delete(page);
    }

    @Transactional(readOnly = true)
    public List<PageResponse> search(String q, String email) {
        User user = getUser(email);
        return pageRepository.searchByKeyword(user.getId(), q)
            .stream().map(PageResponse::from).toList();
    }

    public PageResponse move(Long id, Long newParentId, String email) {
        Page page = getPageOwned(id, email);
        if (newParentId != null && id.equals(newParentId)) {
            throw new IllegalArgumentException("순환 참조: 자기 자신 또는 후손을 부모로 설정할 수 없습니다.");
        }
        Page newParent = newParentId != null
            ? pageRepository.findById(newParentId).orElseThrow(() -> new IllegalArgumentException("부모 페이지를 찾을 수 없습니다."))
            : null;
        if (newParent != null && !newParent.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
        // Cycle prevention: walk up newParent's ancestor chain; if we encounter the page being moved, reject.
        Page cursor = newParent;
        while (cursor != null) {
            if (id.equals(cursor.getId())) {
                throw new IllegalArgumentException("순환 참조: 자기 자신 또는 후손을 부모로 설정할 수 없습니다.");
            }
            cursor = cursor.getParent();
        }
        page.setParent(newParent);
        return PageResponse.from(page);
    }

    public PageResponse addTag(Long pageId, Long tagId, String email) {
        Page page = getPageOwned(pageId, email);
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없습니다."));
        if (!tag.getUser().getId().equals(page.getUser().getId())) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
        page.addTag(tag);
        return PageResponse.from(page);
    }

    public PageResponse removeTag(Long pageId, Long tagId, String email) {
        Page page = getPageOwned(pageId, email);
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없습니다."));
        if (!tag.getUser().getId().equals(page.getUser().getId())) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
        page.removeTag(tag);
        return PageResponse.from(page);
    }

    // 페이지 즐겨찾기 토글 — 소유자만 가능
    public PageResponse toggleFavorite(Long id, boolean value, String email) {
        Page page = getPageOwned(id, email);
        page.setFavorite(value);
        return PageResponse.from(page);
    }

    // 사용자의 즐겨찾기 페이지 목록 (제목순) — 읽기 전용 트랜잭션
    @Transactional(readOnly = true)
    public List<PageResponse> getFavorites(String email) {
        User user = getUser(email);
        return pageRepository.findByUserIdAndFavoriteTrueOrderByTitleAsc(user.getId())
            .stream().map(PageResponse::from).toList();
    }

    private Page getPageOwned(Long id, String email) {
        Page page = pageRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("페이지를 찾을 수 없습니다."));
        if (!page.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }
        return page;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }
}
