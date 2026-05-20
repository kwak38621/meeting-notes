# Meeting Notes Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion 스타일 회의록 앱에 다크모드 / 커맨드 팔레트+즐겨찾기 / 회의록 템플릿 3가지 기능을 추가한다.

**Architecture:** 백엔드는 `Page` 엔티티에 `favorite` 컬럼만 추가하고 토글/조회 엔드포인트 2개 신설. 프론트엔드는 `ThemeContext`로 라이트/다크 색상 객체를 전역 공급해 inline `style` 객체를 동적으로 만들고, `CommandPalette` 컴포넌트를 항상 마운트해 Ctrl+K로 토글한다. 6개 템플릿은 상수 모듈로 두고 빈 페이지 본문에 적용한다.

**Tech Stack:** Spring Boot 3.2.4, JPA, JUnit 5 + Mockito (백엔드) / React 18, react-router-dom, Quill, axios (프론트엔드)

**Reference spec:** `docs/superpowers/specs/2026-05-20-meeting-notes-enhancements-design.md`

---

## Phase A — Backend (즐겨찾기 데이터/엔드포인트)

### Task A1: `Page` 엔티티에 `favorite` 컬럼 추가

**Files:**
- Modify: `backend/src/main/java/com/meetingnotes/page/Page.java`

- [ ] **Step 1: 엔티티에 favorite 필드와 setter 추가**

`Page.java`의 기존 필드 영역 (예: `sortOrder` 아래)에 추가:

```java
    @Column(nullable = false)
    private boolean favorite = false;
```

빌더에는 추가하지 않는다 (기본값 false). 토글용 메서드 추가:

```java
    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
    }
```

`@Getter`가 클래스 레벨에 있으니 `isFavorite()`는 자동 생성.

- [ ] **Step 2: 컴파일 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/page/Page.java
git commit -m "feat(page): add favorite column to Page entity"
```

---

### Task A2: `PageRepository`에 즐겨찾기 조회 메서드 추가

**Files:**
- Modify: `backend/src/main/java/com/meetingnotes/page/PageRepository.java`

- [ ] **Step 1: 메서드 추가**

```java
List<Page> findByUserIdAndFavoriteTrueOrderByTitleAsc(Long userId);
```

기존 메서드 아래에. 패키지/import 변경 없음 (List 이미 import됨).

- [ ] **Step 2: 컴파일 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/page/PageRepository.java
git commit -m "feat(page): add repository method for favorites"
```

---

### Task A3: `PageResponse`/`PageTreeResponse` DTO에 favorite 노출

**Files:**
- Modify: `backend/src/main/java/com/meetingnotes/page/dto/PageResponse.java`
- Modify: `backend/src/main/java/com/meetingnotes/page/dto/PageTreeResponse.java`

- [ ] **Step 1: PageResponse에 favorite 추가**

`PageResponse.java`를 다음과 같이 교체:

```java
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
    boolean favorite,
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
            page.isFavorite(),
            page.getTags().stream().map(TagResponse::from).toList(),
            page.getCreatedAt(),
            page.getUpdatedAt()
        );
    }
}
```

- [ ] **Step 2: PageTreeResponse에 favorite 추가**

`PageTreeResponse.java`를 다음과 같이 교체:

```java
package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import java.util.List;

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
```

- [ ] **Step 3: 컴파일 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/page/dto/PageResponse.java backend/src/main/java/com/meetingnotes/page/dto/PageTreeResponse.java
git commit -m "feat(page): expose favorite field in DTOs"
```

---

### Task A4: `PageService`에 toggleFavorite / getFavorites — 테스트 먼저

**Files:**
- Modify: `backend/src/test/java/com/meetingnotes/page/PageServiceTest.java`
- Modify: `backend/src/main/java/com/meetingnotes/page/PageService.java`

- [ ] **Step 1: 실패하는 테스트 작성**

`PageServiceTest.java`의 마지막 `}` 직전에 다음 테스트 3개 추가:

```java
    @Test
    void toggleFavorite_소유자_성공() {
        User owner = mockUser();
        Page page = Page.builder().title("p").user(owner).content("").emoji("📝").sortOrder(0).build();
        when(pageRepository.findById(1L)).thenReturn(Optional.of(page));

        pageService.toggleFavorite(1L, true, "test@test.com");

        assertThat(page.isFavorite()).isTrue();
    }

    @Test
    void toggleFavorite_타인페이지_예외() {
        User owner = mockUser();
        Page page = Page.builder().title("p").user(owner).content("").emoji("📝").sortOrder(0).build();
        when(pageRepository.findById(1L)).thenReturn(Optional.of(page));

        assertThatThrownBy(() -> pageService.toggleFavorite(1L, true, "other@test.com"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("접근 권한");
    }

    @Test
    void getFavorites_본인페이지만_반환() {
        User user = mockUser();
        ReflectionTestUtils.setField(user, "id", 10L);
        Page p1 = Page.builder().title("a").user(user).content("").emoji("📝").sortOrder(0).build();
        p1.setFavorite(true);
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(pageRepository.findByUserIdAndFavoriteTrueOrderByTitleAsc(10L))
            .thenReturn(java.util.List.of(p1));

        var result = pageService.getFavorites("test@test.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("a");
    }
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && ./gradlew test --tests PageServiceTest`
Expected: 3개 신규 테스트 컴파일 실패 (메서드 없음) 또는 런타임 실패.

- [ ] **Step 3: PageService에 메서드 2개 추가**

`PageService.java`의 `removeTag` 메서드와 `getPageOwned` private 메서드 사이에 추가:

```java
    public PageResponse toggleFavorite(Long id, boolean value, String email) {
        Page page = getPageOwned(id, email);
        page.setFavorite(value);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public List<PageResponse> getFavorites(String email) {
        User user = getUser(email);
        return pageRepository.findByUserIdAndFavoriteTrueOrderByTitleAsc(user.getId())
            .stream().map(PageResponse::from).toList();
    }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && ./gradlew test --tests PageServiceTest`
Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/page/PageService.java backend/src/test/java/com/meetingnotes/page/PageServiceTest.java
git commit -m "feat(page): add toggleFavorite and getFavorites service methods"
```

---

### Task A5: `PageController`에 즐겨찾기 엔드포인트 2개 추가

**Files:**
- Modify: `backend/src/main/java/com/meetingnotes/page/PageController.java`

- [ ] **Step 1: 엔드포인트 추가**

기존 `move` 메서드 아래, 클래스 닫는 `}` 직전에:

```java
    @PatchMapping("/{id}/favorite")
    public ResponseEntity<ApiResponse<PageResponse>> toggleFavorite(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails user) {
        boolean value = Boolean.TRUE.equals(body.get("favorite"));
        return ResponseEntity.ok(ApiResponse.ok(pageService.toggleFavorite(id, value, user.getUsername())));
    }

    @GetMapping("/favorites")
    public ResponseEntity<ApiResponse<List<PageResponse>>> getFavorites(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.getFavorites(user.getUsername())));
    }
```

`Map`은 이미 import됨.

- [ ] **Step 2: 백엔드 빌드 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: 전체 테스트 실행**

Run: `cd backend && ./gradlew test`
Expected: 모든 테스트 PASS.

- [ ] **Step 4: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/page/PageController.java
git commit -m "feat(page): add favorite toggle and list endpoints"
```

---

## Phase B — 프론트엔드 다크모드 인프라

### Task B1: 테마 정의 모듈 작성

**Files:**
- Create: `frontend/src/styles/theme.js`

- [ ] **Step 1: 파일 생성**

```js
// 라이트/다크 테마 색상 팔레트. ThemeContext에서 현재 모드의 객체를 colors로 노출.
export const lightColors = {
  bg: '#ffffff',
  sidebarBg: '#f7f6f3',
  border: '#e8e5de',
  text: '#2f2f2f',
  textMuted: '#787774',
  accent: '#2383e2',
  hoverBg: '#efefef',
  selectedBg: '#e8f0fe',
  inputBg: '#ffffff',
  shadow: '0 4px 12px rgba(0,0,0,.08)',
  modalOverlay: 'rgba(0,0,0,.35)',
  danger: '#e03e3e',
};

export const darkColors = {
  bg: '#0d1117',
  sidebarBg: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
  accent: '#58a6ff',
  hoverBg: '#1f242c',
  selectedBg: '#1f6feb33',
  inputBg: '#0d1117',
  shadow: '0 4px 12px rgba(0,0,0,.5)',
  modalOverlay: 'rgba(0,0,0,.6)',
  danger: '#f85149',
};

export const themes = { light: lightColors, dark: darkColors };
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/styles/theme.js
git commit -m "feat(theme): define light and dark color palettes"
```

---

### Task B2: ThemeContext 생성

**Files:**
- Create: `frontend/src/context/ThemeContext.jsx`

- [ ] **Step 1: 파일 생성**

```jsx
// 테마 모드(light/dark)와 토글, 현재 colors를 전역 공급. localStorage에 모드 영속화.
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { themes } from '../styles/theme';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'theme';

export function ThemeProvider({ children }) {
  // 초기값: localStorage에 'dark'면 dark, 그 외(없거나 잘못된 값)는 light
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // 모드 변경 시 localStorage 동기화
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : 'light'));
  }, []);

  const colors = themes[mode];

  const value = useMemo(() => ({ mode, toggle, colors }), [mode, toggle, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/context/ThemeContext.jsx
git commit -m "feat(theme): add ThemeContext with localStorage persistence"
```

---

### Task B3: App.jsx에 ThemeProvider 적용

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: 수정**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WorkspacePage from './pages/WorkspacePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>로딩 중...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/*" element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: 페이지 로드 확인 (수동)**

프론트 dev 서버 떠있는 상태에서 http://localhost:3000/ 열어 에러 없이 로딩되는지 확인. (테마 적용은 다음 태스크에서.)

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/App.jsx
git commit -m "feat(theme): wrap app with ThemeProvider"
```

---

### Task B4: Quill 에디터 다크 스타일 오버라이드

**Files:**
- Create: `frontend/src/styles/quill-dark.js`
- Modify: `frontend/src/context/ThemeContext.jsx`

- [ ] **Step 1: Quill 다크 CSS 문자열 모듈 생성**

```js
// Quill 에디터는 클래스 기반 CSS라 inline style로 색을 못 바꿈. mode가 dark일 때만
// <style id="quill-dark-overrides">를 document.head에 주입.
export const QUILL_DARK_CSS = `
.ql-toolbar.ql-snow { background: #161b22; border-color: #30363d !important; }
.ql-toolbar .ql-stroke { stroke: #c9d1d9; }
.ql-toolbar .ql-fill { fill: #c9d1d9; }
.ql-toolbar .ql-picker-label { color: #c9d1d9; }
.ql-toolbar button:hover .ql-stroke,
.ql-toolbar .ql-picker-label:hover { color: #58a6ff; }
.ql-toolbar button:hover .ql-stroke { stroke: #58a6ff; }
.ql-container.ql-snow { background: #0d1117; border-color: #30363d !important; color: #c9d1d9; }
.ql-editor { color: #c9d1d9; }
.ql-editor.ql-blank::before { color: #8b949e; }
.ql-picker-options { background: #161b22 !important; border-color: #30363d !important; color: #c9d1d9; }
.ql-snow .ql-tooltip { background: #161b22; border-color: #30363d; color: #c9d1d9; box-shadow: 0 4px 12px rgba(0,0,0,.5); }
.ql-snow .ql-tooltip input[type=text] { background: #0d1117; color: #c9d1d9; border-color: #30363d; }
.ql-editor blockquote { border-left-color: #30363d; color: #8b949e; }
.ql-editor pre.ql-syntax { background: #0d1117; color: #c9d1d9; }
`;
```

- [ ] **Step 2: ThemeContext에서 모드에 따라 스타일 주입**

`frontend/src/context/ThemeContext.jsx`의 `import` 줄 아래에:

```jsx
import { QUILL_DARK_CSS } from '../styles/quill-dark';
```

기존 `useEffect`(localStorage 동기화) 아래에 새 useEffect 추가:

```jsx
  // dark 모드일 때만 Quill 오버라이드 CSS를 document.head에 주입
  useEffect(() => {
    const id = 'quill-dark-overrides';
    const existing = document.getElementById(id);
    if (mode === 'dark') {
      if (!existing) {
        const el = document.createElement('style');
        el.id = id;
        el.textContent = QUILL_DARK_CSS;
        document.head.appendChild(el);
      }
    } else if (existing) {
      existing.remove();
    }
  }, [mode]);
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/styles/quill-dark.js frontend/src/context/ThemeContext.jsx
git commit -m "feat(theme): inject Quill dark stylesheet when dark mode"
```

---

## Phase C — 프론트엔드 컴포넌트를 useTheme로 전환

### Task C1: Sidebar를 useTheme로 전환 + 다크 토글 버튼 추가

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: import 추가 & makeStyles 패턴으로 변환**

`Sidebar.jsx` 상단 import에 추가:

```jsx
import { useTheme } from '../context/ThemeContext';
```

컴포넌트 본문 시작 부분(`const { user, logout } = useAuth();` 위 또는 옆)에:

```jsx
  const { mode, toggle, colors } = useTheme();
  const styles = makeStyles(colors);
```

기존 헤더 JSX (logo + userName) 옆에 토글 버튼 삽입:

```jsx
      <div style={styles.header}>
        <span style={styles.logo}>📋</span>
        <span style={styles.userName}>{user?.name}</span>
        <button style={styles.themeBtn} onClick={toggle} title="테마 전환">
          {mode === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
```

파일 하단의 `const styles = { ... };`을 `const makeStyles = (c) => ({ ... });`로 바꾸고, 모든 색상 리터럴을 `c.*`로 치환. 예:

```jsx
const makeStyles = (c) => ({
  sidebar: { width: '240px', height: '100vh', background: c.sidebarBg, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 },
  header: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${c.border}` },
  logo: { fontSize: '20px' },
  userName: { fontSize: '14px', fontWeight: 600, color: c.text, flex: 1 },
  themeBtn: { background: 'transparent', border: 0, cursor: 'pointer', fontSize: '16px', padding: '4px' },
  search: { margin: '8px 12px', padding: '6px 10px', border: `1px solid ${c.border}`, borderRadius: '4px', background: c.inputBg, color: c.text, outline: 'none' },
  tree: { flex: 1, overflow: 'auto', padding: '8px 0' },
  footer: { padding: '12px', borderTop: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '6px' },
  newPageBtn: { padding: '8px', background: c.accent, color: '#fff', border: 0, borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  logoutBtn: { padding: '6px', background: 'transparent', color: c.textMuted, border: `1px solid ${c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
});
```

(파일에 실제 있는 스타일 키들에 맞춰 동일 변환 적용. 빠뜨린 키 없는지 검토.)

- [ ] **Step 2: 브라우저 확인 (수동)**

새로고침. 라이트에서 정상 표시, 🌙 버튼 클릭 → 사이드바만 다크로 전환 (다른 영역은 아직 라이트 그대로 — 정상).

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/Sidebar.jsx
git commit -m "feat(theme): convert Sidebar to useTheme and add dark mode toggle"
```

---

### Task C2: PageTreeNode를 useTheme로 전환

**Files:**
- Modify: `frontend/src/components/PageTreeNode.jsx`

- [ ] **Step 1: 동일 패턴 적용**

상단 import에 `useTheme` 추가. 컴포넌트 본문에서 `const { colors } = useTheme(); const styles = makeStyles(colors);`. 하단 `const styles = { ... };`을 `const makeStyles = (c) => ({ ... });`로 변환. 모든 색상 리터럴 → `c.*` 치환.

매핑 가이드:
- `#fff`, `#ffffff` (배경) → `c.bg`
- `#f7f6f3` → `c.sidebarBg`
- `#e8e5de` → `c.border`
- `#2f2f2f`, `#000` → `c.text`
- `#787774`, `#999` → `c.textMuted`
- 호버 배경 → `c.hoverBg`
- 선택된 배경(파란계열) → `c.selectedBg`

- [ ] **Step 2: 브라우저 확인 (수동)**

다크 모드 켠 상태에서 페이지 트리 노드들이 다크로 전환되는지. hover 시 배경 변화 자연스러운지.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/PageTreeNode.jsx
git commit -m "feat(theme): convert PageTreeNode to useTheme"
```

---

### Task C3: TagInput, Editor를 useTheme로 전환

**Files:**
- Modify: `frontend/src/components/TagInput.jsx`
- Modify: `frontend/src/components/Editor.jsx`

- [ ] **Step 1: TagInput 변환**

C2와 동일 패턴. Quill과 무관하므로 inline style만 변환.

- [ ] **Step 2: Editor 변환**

C2와 동일 패턴. Editor 컨테이너 자체의 padding/background는 useTheme로 처리. Quill 내부는 Task B4의 CSS 오버라이드가 담당.

- [ ] **Step 3: 브라우저 확인 (수동)**

페이지를 하나 열고 다크 모드에서 에디터/태그 입력이 가독성 OK. 라이트로 돌렸을 때 원래대로 복원.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/components/TagInput.jsx frontend/src/components/Editor.jsx
git commit -m "feat(theme): convert TagInput and Editor to useTheme"
```

---

### Task C4: WorkspacePage, PageDetailPage를 useTheme로 전환

**Files:**
- Modify: `frontend/src/pages/WorkspacePage.jsx`
- Modify: `frontend/src/pages/PageDetailPage.jsx`

- [ ] **Step 1: 두 파일 동일 패턴 변환**

각 페이지의 inline `style` 객체를 `makeStyles(colors)`로 변환. 배경/텍스트/보더 색상을 `c.bg`, `c.text`, `c.border`로 치환.

- [ ] **Step 2: 브라우저 확인 (수동)**

워크스페이스 전체와 페이지 상세 화면 모두 다크에서 일관되게 표시.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/WorkspacePage.jsx frontend/src/pages/PageDetailPage.jsx
git commit -m "feat(theme): convert Workspace and PageDetail pages to useTheme"
```

---

### Task C5: LoginPage, RegisterPage를 useTheme로 전환

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/RegisterPage.jsx`

- [ ] **Step 1: 두 파일 변환**

동일 패턴. 두 페이지는 로그인 전이지만 `ThemeProvider`가 트리 최상단이므로 useTheme 사용 가능.

- [ ] **Step 2: 브라우저 확인 (수동)**

로그아웃하고 로그인/회원가입 화면 보기. 둘 다 다크/라이트 정상 전환.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/RegisterPage.jsx
git commit -m "feat(theme): convert Login and Register pages to useTheme"
```

---

## Phase D — 프론트엔드 즐겨찾기 UI

### Task D1: api/pages.js에 즐겨찾기 호출 추가

**Files:**
- Modify: `frontend/src/api/pages.js`

- [ ] **Step 1: export 추가**

기존 export 아래에:

```js
export const toggleFavorite = (id, favorite) => api.patch(`/pages/${id}/favorite`, { favorite });
export const getFavorites = () => api.get('/pages/favorites');
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/api/pages.js
git commit -m "feat(api): add favorite toggle and list calls"
```

---

### Task D2: PageContext에 favorites 상태 추가

**Files:**
- Modify: `frontend/src/context/PageContext.jsx`

- [ ] **Step 1: 수정**

```jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { getPageTree, getFavorites } from '../api/pages';

const PageContext = createContext(null);

export function PageProvider({ children }) {
  const [pageTree, setPageTree] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);

  const refreshTree = useCallback(async () => {
    const res = await getPageTree();
    setPageTree(res.data.data);
  }, []);

  const refreshFavorites = useCallback(async () => {
    const res = await getFavorites();
    setFavorites(res.data.data);
  }, []);

  return (
    <PageContext.Provider
      value={{ pageTree, refreshTree, favorites, refreshFavorites, selectedPageId, setSelectedPageId }}
    >
      {children}
    </PageContext.Provider>
  );
}

export const usePageContext = () => useContext(PageContext);
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/context/PageContext.jsx
git commit -m "feat(page): add favorites state and refresh to PageContext"
```

---

### Task D3: Sidebar에 즐겨찾기 섹션 + PageTreeNode에 별 토글

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/PageTreeNode.jsx`

- [ ] **Step 1: Sidebar에 즐겨찾기 섹션 추가**

`Sidebar.jsx` 본문에서:

```jsx
  const { pageTree, refreshTree, favorites, refreshFavorites } = usePageContext();
```

`react-router-dom`의 `useNavigate`도 import해 컴포넌트 본문에서:

```jsx
  const navigate = useNavigate();
```

useEffect에서 둘 다 호출:

```jsx
  useEffect(() => {
    refreshTree();
    refreshFavorites();
  }, [refreshTree, refreshFavorites]);
```

JSX의 `<div style={styles.tree}>` 바로 위에 즐겨찾기 섹션 삽입:

```jsx
      {favorites.length > 0 && (
        <div style={styles.favSection}>
          <div style={styles.favHeader}>⭐ 즐겨찾기 ({favorites.length})</div>
          {favorites.map((p) => (
            <div key={p.id} style={styles.favItem} onClick={() => navigate(`/pages/${p.id}`)}>
              <span>{p.emoji || '📄'}</span>
              <span>{p.title}</span>
            </div>
          ))}
        </div>
      )}
```

`makeStyles`에 추가:

```jsx
  favSection: { padding: '4px 0', borderBottom: `1px solid ${c.border}` },
  favHeader: { padding: '6px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', color: c.textMuted },
  favItem: { padding: '6px 16px', fontSize: '13px', color: c.text, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
```

- [ ] **Step 2: PageTreeNode에 별 토글 버튼 추가**

import 추가:

```jsx
import { toggleFavorite } from '../api/pages';
```

컴포넌트 props에서 `node`는 이미 받음. `usePageContext`에서 `refreshTree, refreshFavorites` 추출.

노드 라벨 우측에 hover 시 노출되는 별 버튼:

```jsx
const handleToggleFav = async (e) => {
  e.stopPropagation();
  await toggleFavorite(node.id, !node.favorite);
  refreshTree();
  refreshFavorites();
};

// JSX 노드 row 내부, 라벨 우측에:
<button style={styles.favBtn} onClick={handleToggleFav} title={node.favorite ? '즐겨찾기 해제' : '즐겨찾기'}>
  {node.favorite ? '⭐' : '☆'}
</button>
```

`makeStyles`에 추가:

```jsx
  favBtn: { background: 'transparent', border: 0, cursor: 'pointer', color: c.textMuted, fontSize: '13px', padding: '0 4px', opacity: 0.6 },
```

(원하면 row hover 시만 보이게 CSS로 조정 가능. 일단 항상 보이게.)

- [ ] **Step 3: 브라우저 확인 (수동)**

페이지 노드에서 ☆ 클릭 → ⭐로 바뀌고 사이드바 상단에 즐겨찾기 섹션 표시. 새로고침 후 유지. 다시 클릭 → 사라짐.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/components/PageTreeNode.jsx
git commit -m "feat(favorites): add sidebar favorites section and tree star toggle"
```

---

## Phase E — 커맨드 팔레트

### Task E1: useHotkey 훅

**Files:**
- Create: `frontend/src/hooks/useHotkey.js`

- [ ] **Step 1: 파일 생성**

```js
// 전역 키보드 단축키 바인딩. combo 예: 'mod+k', 'esc'.
// 'mod'는 Mac이면 metaKey, 그 외 ctrlKey.
import { useEffect } from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function matches(combo, e) {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const modKey = isMac ? e.metaKey : e.ctrlKey;
  const needMod = parts.includes('mod');
  const needShift = parts.includes('shift');
  if (needMod !== modKey) return false;
  if (needShift !== e.shiftKey) return false;
  if (key === 'esc') return e.key === 'Escape';
  return e.key.toLowerCase() === key;
}

export function useHotkey(combo, handler, deps = []) {
  useEffect(() => {
    const fn = (e) => {
      if (matches(combo, e)) {
        e.preventDefault();
        handler(e);
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/hooks/useHotkey.js
git commit -m "feat(hooks): add useHotkey for global keyboard shortcuts"
```

---

### Task E2: useRecentPages 훅

**Files:**
- Create: `frontend/src/hooks/useRecentPages.js`

- [ ] **Step 1: 파일 생성**

```js
// 최근 본 페이지 id를 localStorage에 누적(최대 10개 저장). 표시는 5개.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'recentPages';
const MAX_STORE = 10;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}

export function useRecentPages() {
  const [ids, setIds] = useState(read);

  // 다른 탭에서 변경된 경우 동기화
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const push = useCallback((id) => {
    setIds((cur) => {
      const next = [id, ...cur.filter((x) => x !== id)].slice(0, MAX_STORE);
      write(next);
      return next;
    });
  }, []);

  return { ids, push };
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/hooks/useRecentPages.js
git commit -m "feat(hooks): add useRecentPages for command palette recents"
```

---

### Task E3: PageDetailPage에서 페이지 열릴 때 recent push

**Files:**
- Modify: `frontend/src/pages/PageDetailPage.jsx`

- [ ] **Step 1: import 추가 및 useEffect 보강**

```jsx
import { useRecentPages } from '../hooks/useRecentPages';
```

컴포넌트 본문에:

```jsx
  const { push: pushRecent } = useRecentPages();
```

페이지 로드 useEffect (기존에 `useParams`로 받은 id로 `getPage` 호출하는 effect)의 성공 분기 또는 별도 effect에서:

```jsx
  useEffect(() => {
    if (id) pushRecent(Number(id));
  }, [id, pushRecent]);
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/pages/PageDetailPage.jsx
git commit -m "feat(recents): push viewed page id to recents"
```

---

### Task E4: CommandPalette 컴포넌트 — 골격 + 빈 상태 + 검색 매칭

**Files:**
- Create: `frontend/src/components/CommandPalette.jsx`

- [ ] **Step 1: 파일 생성**

```jsx
// Ctrl+K로 열리는 커맨드 팔레트. 빈 query면 최근 페이지, 입력 시 페이지+액션 매칭.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePageContext } from '../context/PageContext';
import { useHotkey } from '../hooks/useHotkey';
import { useRecentPages } from '../hooks/useRecentPages';
import { createPage } from '../api/pages';

// 트리(중첩 children)를 평탄화해 id -> {id,title,emoji} 맵으로 만든다.
function flattenTree(tree, out = new Map()) {
  for (const n of tree || []) {
    out.set(n.id, { id: n.id, title: n.title, emoji: n.emoji });
    if (n.children?.length) flattenTree(n.children, out);
  }
  return out;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const { colors, toggle: toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { pageTree, refreshTree } = usePageContext();
  const { ids: recentIds } = useRecentPages();
  const navigate = useNavigate();

  const styles = makeStyles(colors);
  const pageMap = useMemo(() => flattenTree(pageTree), [pageTree]);

  // Ctrl+K로 열기
  useHotkey('mod+k', () => { setOpen(true); setQuery(''); setCursor(0); }, []);

  // 열릴 때 input 포커스
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // 액션 레지스트리
  const actions = useMemo(() => ([
    { id: 'new-page', label: '새 페이지 만들기', icon: '➕', run: async () => {
      const res = await createPage({ title: '새 페이지', content: '', emoji: '📄' });
      await refreshTree();
      navigate(`/pages/${res.data.data.id}`);
    }},
    { id: 'toggle-dark', label: '다크모드 토글', icon: '🌙', run: () => toggleTheme() },
    { id: 'logout', label: '로그아웃', icon: '🚪', run: () => logout() },
  ]), [refreshTree, navigate, toggleTheme, logout]);

  // 매칭 계산
  const { items, sections } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recent = recentIds
        .map((id) => pageMap.get(id))
        .filter(Boolean)
        .slice(0, 5)
        .map((p) => ({ kind: 'page', ...p }));
      return { items: recent, sections: [{ label: '최근 본 페이지', start: 0, end: recent.length }] };
    }
    const pages = [...pageMap.values()]
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ kind: 'page', ...p }));
    const acts = actions
      .filter((a) => a.label.toLowerCase().includes(q))
      .map((a) => ({ kind: 'action', ...a }));
    const flat = [...pages, ...acts];
    const sections = [];
    if (pages.length) sections.push({ label: '페이지', start: 0, end: pages.length });
    if (acts.length) sections.push({ label: '액션', start: pages.length, end: pages.length + acts.length });
    return { items: flat, sections };
  }, [query, pageMap, recentIds, actions]);

  // cursor 범위 보정
  useEffect(() => { if (cursor >= items.length) setCursor(0); }, [items.length, cursor]);

  const runItem = (item) => {
    setOpen(false);
    if (item.kind === 'page') navigate(`/pages/${item.id}`);
    else item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(items.length - 1, c + 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (items[cursor]) runItem(items[cursor]); }
  };

  if (!open) return null;

  return (
    <div style={styles.overlay} onMouseDown={() => setOpen(false)}>
      <div style={styles.box} onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="페이지 검색 또는 명령 실행..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={onKeyDown}
        />
        <div style={styles.list}>
          {sections.map((sec) => (
            <div key={sec.label}>
              <div style={styles.sectionLabel}>{sec.label}</div>
              {items.slice(sec.start, sec.end).map((it, idx) => {
                const realIdx = sec.start + idx;
                const active = realIdx === cursor;
                return (
                  <div
                    key={`${it.kind}-${it.id}`}
                    style={{ ...styles.row, background: active ? colors.selectedBg : 'transparent' }}
                    onMouseEnter={() => setCursor(realIdx)}
                    onClick={() => runItem(it)}
                  >
                    <span>{it.kind === 'page' ? (it.emoji || '📄') : it.icon}</span>
                    <span>{it.kind === 'page' ? it.title : it.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div style={styles.empty}>일치하는 결과가 없습니다.</div>
          )}
        </div>
        <div style={styles.footer}>
          <span>↑↓ 이동</span><span>↵ 선택</span><span>esc 닫기</span>
        </div>
      </div>
    </div>
  );
}

const makeStyles = (c) => ({
  overlay: { position: 'fixed', inset: 0, background: c.modalOverlay, zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '15vh' },
  box: { width: 'min(560px, 90vw)', background: c.sidebarBg, border: `1px solid ${c.border}`, borderRadius: '8px', boxShadow: c.shadow, overflow: 'hidden', height: 'fit-content' },
  input: { width: '100%', padding: '14px 18px', border: 0, borderBottom: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  list: { maxHeight: '50vh', overflow: 'auto', padding: '6px 0' },
  sectionLabel: { padding: '6px 18px 2px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.05em', color: c.textMuted },
  row: { padding: '8px 18px', color: c.text, display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' },
  empty: { padding: '16px 18px', color: c.textMuted, fontSize: '13px' },
  footer: { padding: '8px 18px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: '14px', fontSize: '11px', color: c.textMuted, background: c.bg },
});
```

- [ ] **Step 2: 컴파일/구문 확인 (수동)**

dev 서버 떠있는 상태에서 새 파일 저장 후 콘솔 에러 없는지. 아직 마운트 안 했으므로 UI는 변화 없음.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/CommandPalette.jsx
git commit -m "feat(palette): add CommandPalette with recents and search"
```

---

### Task E5: WorkspacePage에 CommandPalette 마운트

**Files:**
- Modify: `frontend/src/pages/WorkspacePage.jsx`

- [ ] **Step 1: 마운트**

import 추가:

```jsx
import CommandPalette from '../components/CommandPalette';
```

WorkspacePage 컴포넌트 JSX 반환부 최상위(또는 사이드바와 메인 컨테이너를 감싸는 fragment 끝)에:

```jsx
      <CommandPalette />
```

(워크스페이스 라우트에만 마운트하면 인증된 화면에서만 동작. 로그인/회원가입 화면에선 의도적으로 미작동.)

- [ ] **Step 2: 브라우저 확인 (수동)**

로그인 후 Ctrl+K → 팔레트 오픈. 빈 상태에서 최근 페이지 5개 (없으면 빈 결과). "회" 입력 시 매칭. ↑↓ ↵ esc 동작. 다크모드 토글 액션 실행 시 즉시 테마 전환.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/WorkspacePage.jsx
git commit -m "feat(palette): mount CommandPalette in workspace"
```

---

## Phase F — 회의록 템플릿

### Task F1: 6개 템플릿 정의

**Files:**
- Create: `frontend/src/templates/index.js`

- [ ] **Step 1: 파일 생성**

```js
// 6개 회의록 템플릿. content는 Quill 호환 HTML.
export const TEMPLATES = [
  {
    id: 'weekly',
    name: '주간 회의',
    emoji: '📋',
    content: `
<h2>주간 회의</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>안건</h3>
<ol><li></li></ol>
<h3>논의 내용</h3>
<p></p>
<h3>액션 아이템</h3>
<ul><li> </li></ul>
`.trim()
  },
  {
    id: 'oneonone',
    name: '1:1 미팅',
    emoji: '👥',
    content: `
<h2>1:1 미팅</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>지난 액션 점검</h3>
<ul><li></li></ul>
<h3>이번 주 논의</h3>
<p></p>
<h3>다음 액션</h3>
<ul><li></li></ul>
<h3>피드백</h3>
<p></p>
`.trim()
  },
  {
    id: 'retro',
    name: '회고 (KPT)',
    emoji: '🔄',
    content: `
<h2>회고 (KPT)</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>Keep — 잘된 점, 유지할 것</h3>
<ul><li></li></ul>
<h3>Problem — 문제, 어려움</h3>
<ul><li></li></ul>
<h3>Try — 다음에 시도할 것</h3>
<ul><li></li></ul>
`.trim()
  },
  {
    id: 'kickoff',
    name: '프로젝트 킥오프',
    emoji: '🚀',
    content: `
<h2>프로젝트 킥오프</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>목표</h3>
<p></p>
<h3>일정 / 주요 마일스톤</h3>
<ul><li></li></ul>
<h3>참여자 / 역할</h3>
<ul><li></li></ul>
<h3>리스크 / 가정</h3>
<ul><li></li></ul>
`.trim()
  },
  {
    id: 'standup',
    name: '데일리 스탠드업',
    emoji: '☀️',
    content: `
<h2>데일리 스탠드업</h2>
<p><strong>날짜:</strong> </p>
<h3>어제 한 일</h3>
<ul><li></li></ul>
<h3>오늘 할 일</h3>
<ul><li></li></ul>
<h3>블로커</h3>
<ul><li></li></ul>
`.trim()
  },
  {
    id: 'interview',
    name: '인터뷰 노트',
    emoji: '🎤',
    content: `
<h2>인터뷰 노트</h2>
<p><strong>후보자:</strong> </p>
<p><strong>일시:</strong> </p>
<h3>평가 항목</h3>
<ul><li>기술 역량: </li><li>커뮤니케이션: </li><li>문화 적합성: </li></ul>
<h3>코멘트</h3>
<p></p>
<h3>결론 / 추천 여부</h3>
<p></p>
`.trim()
  },
];

export const findTemplate = (id) => TEMPLATES.find((t) => t.id === id);
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/templates/index.js
git commit -m "feat(templates): define 6 meeting note templates"
```

---

### Task F2: TemplatePicker 컴포넌트

**Files:**
- Create: `frontend/src/components/TemplatePicker.jsx`

- [ ] **Step 1: 파일 생성**

```jsx
// 빈 페이지에 표시되는 템플릿 시작 띠. 클릭 시 드롭다운으로 6개 템플릿 노출.
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { TEMPLATES } from '../templates';

export default function TemplatePicker({ onPick }) {
  const { colors } = useTheme();
  const [openMenu, setOpenMenu] = useState(false);
  const styles = makeStyles(colors);

  return (
    <div style={styles.banner}>
      <span>💡 빈 페이지예요. 템플릿에서 시작하시겠어요?</span>
      <div style={{ position: 'relative' }}>
        <button style={styles.btn} onClick={() => setOpenMenu((v) => !v)}>
          ▾ 템플릿
        </button>
        {openMenu && (
          <div style={styles.menu}>
            {TEMPLATES.map((t) => (
              <div
                key={t.id}
                style={styles.item}
                onClick={() => { setOpenMenu(false); onPick(t); }}
              >
                <span>{t.emoji}</span><span>{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const makeStyles = (c) => ({
  banner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', margin: '12px 0', border: `1px dashed ${c.border}`, borderRadius: '6px', background: c.sidebarBg, color: c.textMuted, fontSize: '13px' },
  btn: { padding: '6px 10px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  menu: { position: 'absolute', top: '110%', right: 0, minWidth: '200px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '6px', boxShadow: c.shadow, padding: '4px 0', zIndex: 10 },
  item: { padding: '8px 14px', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', color: c.text, fontSize: '13px' },
});
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/TemplatePicker.jsx
git commit -m "feat(templates): add TemplatePicker banner component"
```

---

### Task F3: PageDetailPage에서 빈 페이지일 때 TemplatePicker 표시

**Files:**
- Modify: `frontend/src/pages/PageDetailPage.jsx`

- [ ] **Step 1: import 및 로직 추가**

```jsx
import TemplatePicker from '../components/TemplatePicker';
```

페이지 상태 중 `content`와 `emoji` 변경 함수가 이미 있을 것 (자동저장 흐름). 다음 헬퍼 추가:

```jsx
const isEmptyContent = (c) => !c || c === '<p><br></p>' || c.replace(/<[^>]*>/g, '').trim() === '';

const handlePickTemplate = (tpl) => {
  // Quill 인스턴스에 직접 주입 — Editor 컴포넌트가 외부에서 setContent 받게 되어 있어야 함.
  // 현재 구현 형태에 따라 두 가지 중 하나:
  // (1) state로 content를 관리 중이면 setContent(tpl.content)
  // (2) Editor가 onChange만 받으면 Editor에 imperativeHandle/key prop 추가 필요.
  // 본 프로젝트는 PageDetailPage가 content state를 보유하므로 (1):
  setContent(tpl.content);
  if (!emoji || emoji === '📄') setEmoji(tpl.emoji);
  // 자동저장 디바운스가 content/emoji 변경을 감지해 백엔드에 저장.
};
```

JSX의 Editor 위에 조건부 띠:

```jsx
      {isEmptyContent(content) && <TemplatePicker onPick={handlePickTemplate} />}
```

- [ ] **Step 2: Editor가 외부 content 변경을 반영하는지 검증**

`Editor.jsx`의 useEffect가 props `value`(또는 `content`) 변경 시 `quill.root.innerHTML = value`로 동기화하는지 확인. 안 되어 있으면 다음 effect 추가:

```jsx
  useEffect(() => {
    if (!quillRef.current) return;
    const cur = quillRef.current.root.innerHTML;
    if (cur !== value) {
      // 외부 주입(템플릿 적용) 시 에디터 내용 동기화
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
    }
  }, [value]);
```

(Editor의 실제 prop 이름과 quillRef 변수에 맞춰 적용.)

- [ ] **Step 3: 브라우저 확인 (수동)**

새 페이지 만들고 본문 비어있는 상태에서 띠 표시 → "주간 회의" 클릭 → 본문에 템플릿 채워짐, 이모지 📋로 변경. 자동저장 대기 후 새로고침 → 내용 유지. 본문에 글자 입력하면 띠 사라짐.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/pages/PageDetailPage.jsx frontend/src/components/Editor.jsx
git commit -m "feat(templates): show template picker on empty pages and apply selection"
```

---

### Task F4: 커맨드 팔레트에 "템플릿으로 새 페이지" 액션

**Files:**
- Modify: `frontend/src/components/CommandPalette.jsx`

- [ ] **Step 1: 모달형 템플릿 선택 추가**

CommandPalette 상태에 추가:

```jsx
const [pickerForId, setPickerForId] = useState(null);
```

actions 배열에 새 액션 추가 (`new-page` 아래):

```jsx
    { id: 'new-tpl', label: '템플릿으로 새 페이지', icon: '📋', run: async () => {
      const res = await createPage({ title: '새 페이지', content: '', emoji: '📄' });
      await refreshTree();
      setPickerForId(res.data.data.id);
    }},
```

import 추가:

```jsx
import { TEMPLATES } from '../templates';
import { updatePage } from '../api/pages';
```

JSX 반환부의 overlay/box 옆에(또는 별도 모달로):

```jsx
{pickerForId !== null && (
  <div style={styles.overlay} onMouseDown={() => setPickerForId(null)}>
    <div style={styles.box} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.sectionLabel}>템플릿 선택</div>
      {TEMPLATES.map((t) => (
        <div
          key={t.id}
          style={styles.row}
          onClick={async () => {
            await updatePage(pickerForId, { title: t.name, content: t.content, emoji: t.emoji });
            await refreshTree();
            const id = pickerForId;
            setPickerForId(null);
            setOpen(false);
            navigate(`/pages/${id}`);
          }}
        >
          <span>{t.emoji}</span><span>{t.name}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

(필요 시 `PageRequest` 백엔드 DTO가 parentId nullable 허용하는지 확인. 기존 `createPage`는 parentId 없이도 동작 — 이미 검증됨.)

- [ ] **Step 2: 브라우저 확인 (수동)**

Ctrl+K → "템플릿으로 새 페이지" 선택 → 템플릿 6개 모달 노출 → "회고 (KPT)" 클릭 → 신규 페이지 생성됨, 이동, 본문 채워짐.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/CommandPalette.jsx
git commit -m "feat(palette): add 'new page from template' action"
```

---

## Phase G — 통합 검증

### Task G1: 백엔드 전체 테스트

- [ ] **Step 1: 전체 빌드 + 테스트**

Run: `cd backend && ./gradlew test`
Expected: 모든 테스트 PASS. 새 `toggleFavorite_*` / `getFavorites_*` 3개 포함.

- [ ] **Step 2: 실패 시 디버그**

실패한 테스트의 에러 메시지를 보고 원인 파악. mock 누락이 흔한 원인 — 새 PageService 메서드가 사용하는 모든 의존성이 `@MockitoSettings(strictness = Strictness.LENIENT)` 덕분에 명시 안 해도 통과해야 함. lenient가 빠지면 unused stubbing 경고.

---

### Task G2: 프론트엔드 E2E 수동 체크리스트

- [ ] 라이트 모드에서 워크스페이스 로드 → 기존 UI 동일하게 표시
- [ ] 🌙 클릭 → 사이드바/페이지트리/에디터/메인 영역 전부 다크로 전환
- [ ] 새로고침 → 다크 모드 유지
- [ ] 로그아웃 후 로그인 화면 → 다크 적용됨, 로그인 폼 가독성 OK
- [ ] 다시 로그인 → 워크스페이스 다크
- [ ] ☀️ 클릭 → 전부 라이트로 복귀
- [ ] Ctrl+K → 팔레트 오픈, 빈 상태에서 최근 페이지(없으면 빈 결과)
- [ ] "주" 같은 검색어 입력 → 페이지 + 액션 필터링
- [ ] ↑↓로 항목 이동, ↵로 페이지 이동/액션 실행
- [ ] 다크모드 토글 액션 → 즉시 전환
- [ ] esc로 팔레트 닫힘
- [ ] 트리에서 ☆ 클릭 → ⭐로 바뀌고 사이드바 상단 즐겨찾기 섹션에 추가
- [ ] 새로고침 → 즐겨찾기 유지
- [ ] 빈 페이지 만들기 → "💡 빈 페이지예요" 띠 노출
- [ ] "주간 회의" 선택 → 본문 채워짐, 이모지 📋
- [ ] 본문 편집 후 새로고침 → 내용 유지
- [ ] Ctrl+K → "템플릿으로 새 페이지" → 모달 → "1:1 미팅" 선택 → 새 페이지로 이동, 채워짐

---

### Task G3: 최종 검증 후 메모리 업데이트

- [ ] **Step 1: 메모리 진행상황 갱신**

`C:/Users/곽성욱/.claude/projects/c--project-project1-/memory/project_meeting_notes_progress.md`의 "완료된 태스크" 섹션에 "✅ enhancements (다크/팔레트/즐겨찾기/템플릿) — 2026-MM-DD" 한 줄 추가.

- [ ] **Step 2: 최종 커밋 — 없음**

각 태스크에서 이미 작은 단위로 커밋했음. 추가 커밋 없음.

---

## Out of Scope (이번 플랜 아님)

- 시스템 다크모드 자동 감지
- 사용자 커스텀 템플릿
- 즐겨찾기 정렬/카테고리
- 슬래시 명령
- 페이지 미리보기

## Risks

| 리스크 | 완화 |
|---|---|
| inline → makeStyles 변환 중 스타일 누락 | 페이즈 C 각 태스크 후 라이트 모드 확인부터 — 시각 회귀 없는지 |
| Quill 다크 셀렉터 빠짐 (placeholder, link 툴팁 등) | G2 체크리스트에서 에디터 모든 블록/툴바 항목 클릭해보기 |
| Ctrl+K가 Quill 포커스 중 안 잡힘 | useHotkey가 document level에 등록 + preventDefault. 안 되면 Quill keyboard 모듈에 별도 등록 |
| recentPages에 삭제된 page id 잔존 | flattenTree로 만든 map 조회 실패 시 자동 스킵 (slice 후 filter Boolean) |
