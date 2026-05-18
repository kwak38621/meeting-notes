package com.meetingnotes.page;

import com.meetingnotes.page.dto.*;
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

    public PageResponse create(PageRequest req, String email) {
        User user = getUser(email);
        Page parent = req.parentId() != null
            ? pageRepository.findById(req.parentId()).orElseThrow(() -> new IllegalArgumentException("부모 페이지를 찾을 수 없습니다."))
            : null;
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
        Page newParent = newParentId != null
            ? pageRepository.findById(newParentId).orElseThrow(() -> new IllegalArgumentException("부모 페이지를 찾을 수 없습니다."))
            : null;
        page.setParent(newParent);
        return PageResponse.from(page);
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
