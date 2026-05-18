package com.meetingnotes.page;

import com.meetingnotes.page.dto.PageRequest;
import com.meetingnotes.page.dto.PageResponse;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PageServiceTest {

    @Mock PageRepository pageRepository;
    @Mock UserRepository userRepository;
    @InjectMocks PageService pageService;

    private User mockUser() {
        return User.builder().email("test@test.com").password("pass").name("홍길동").build();
    }

    @Test
    void createPage_루트페이지_성공() {
        User user = mockUser();
        PageRequest req = new PageRequest("회의록 제목", "내용", null, "📝");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(pageRepository.save(any(Page.class))).thenAnswer(i -> i.getArgument(0));

        assertThatCode(() -> pageService.create(req, "test@test.com")).doesNotThrowAnyException();
        verify(pageRepository).save(any(Page.class));
    }

    @Test
    void updatePage_권한없는_사용자_예외() {
        User owner = mockUser();
        User other = User.builder().email("other@test.com").password("pass").name("다른사람").build();
        Page page = Page.builder().title("제목").user(owner).content("").emoji("📝").sortOrder(0).build();

        when(pageRepository.findById(1L)).thenReturn(Optional.of(page));
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(other));

        PageRequest req = new PageRequest("수정된 제목", "", null, "📝");
        assertThatThrownBy(() -> pageService.update(1L, req, "other@test.com"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("권한");
    }

    @Test
    void createPage_타인의_부모페이지_예외() {
        User caller = mockUser();
        User other = User.builder().email("other@test.com").password("pass").name("다른사람").build();
        Page othersParent = Page.builder().title("타인 페이지").user(other).content("").emoji("📝").sortOrder(0).build();

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(caller));
        when(pageRepository.findById(99L)).thenReturn(Optional.of(othersParent));

        PageRequest req = new PageRequest("자식", "내용", 99L, "📝");
        assertThatThrownBy(() -> pageService.create(req, "test@test.com"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("권한");
    }

    @Test
    void movePage_자기자신을_부모로_예외() {
        User user = mockUser();
        Page page = Page.builder().title("페이지").user(user).content("").emoji("📝").sortOrder(0).build();
        ReflectionTestUtils.setField(page, "id", 1L);

        when(pageRepository.findById(1L)).thenReturn(Optional.of(page));
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> pageService.move(1L, 1L, "test@test.com"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("순환");
    }

    @Test
    void movePage_후손을_부모로_예외() {
        User user = mockUser();
        Page pageA = Page.builder().title("A").user(user).content("").emoji("📝").sortOrder(0).build();
        ReflectionTestUtils.setField(pageA, "id", 1L);
        Page pageB = Page.builder().title("B").user(user).content("").emoji("📝").sortOrder(0).parent(pageA).build();
        ReflectionTestUtils.setField(pageB, "id", 2L);

        when(pageRepository.findById(1L)).thenReturn(Optional.of(pageA));
        when(pageRepository.findById(2L)).thenReturn(Optional.of(pageB));
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> pageService.move(1L, 2L, "test@test.com"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("순환");
    }
}
