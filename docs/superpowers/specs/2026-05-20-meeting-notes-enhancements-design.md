# Meeting Notes Enhancements — Design

**Date:** 2026-05-20
**Scope:** 다크모드, 커맨드 팔레트(+즐겨찾기), 회의록 템플릿 — 3개 기능을 하나의 스펙으로 묶음.
**Base commit:** 4bf4d02 (Gradle 마이그레이션 직후)

## Goals

회의록 앱의 시각적 밋밋함을 해소하고 실사용 효율성을 높이는 3가지 기능을 추가한다.

1. **다크모드** — 사용자가 수동 토글하여 라이트/다크 전환. localStorage 영속화.
2. **커맨드 팔레트 + 즐겨찾기** — Ctrl+K로 페이지 점프/액션 실행. 즐겨찾기는 사이드바 상단 섹션.
3. **회의록 템플릿** — 6개 사전정의 템플릿. 빈 페이지에서 선택해 본문 채움.

## Non-Goals

- 시스템(`prefers-color-scheme`) 자동 감지
- 사용자가 직접 만드는 커스텀 템플릿
- 즐겨찾기 정렬/카테고리/팀 공유
- 슬래시 명령 (`/template` 같은 에디터 인라인 명령)

## Architecture Overview

### 추가될 프론트엔드 모듈 (`frontend/src/`)

| 경로 | 역할 |
|---|---|
| `context/ThemeContext.jsx` | 테마 상태(`'light' | 'dark'`), `toggle()`, localStorage 영속화 |
| `styles/theme.js` | 라이트/다크 색상 객체 + 컴포넌트가 사용하는 `colors` 셋 |
| `components/CommandPalette.jsx` | Ctrl+K로 열리는 모달. 검색/액션 디스패치 |
| `components/TemplatePicker.jsx` | 빈 페이지 본문 상단 "템플릿에서 시작" 드롭다운 |
| `templates/index.js` | 6개 회의록 템플릿 (Quill HTML) 상수 export |
| `hooks/useRecentPages.js` | 최근 본 페이지 ID 5개 localStorage 관리 |
| `hooks/useHotkey.js` | 키보드 단축키 바인딩 헬퍼 (mod+k 등) |

### 수정될 프론트엔드 파일

- 모든 컴포넌트 inline `style` 객체 → `useTheme()`에서 받은 `colors`로 동적 색상 적용 (`Sidebar.jsx`, `PageTreeNode.jsx`, `Editor.jsx`, `TagInput.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `WorkspacePage.jsx`, `PageDetailPage.jsx` 8개)
- `App.jsx` — `ThemeProvider`로 트리 감싸기, 전역 키보드 단축키 등록, `CommandPalette`를 워크스페이스 라우트에 항상 마운트
- `Sidebar.jsx` — 즐겨찾기 섹션 추가, 사용자 이름 옆 다크 토글 버튼
- `context/PageContext.jsx` — `favorites` 상태와 `refreshFavorites()` 추가
- `api/pages.js` — `toggleFavorite(id, value)`, `getFavorites()` 호출 추가
- `pages/PageDetailPage.jsx` — 본문이 빈 경우 `TemplatePicker` 띠 노출. 페이지 열릴 때 최근 페이지 push

### 백엔드 변경

- `Page` 엔티티: `@Column boolean favorite = false` 추가 (JPA `ddl-auto: update`로 자동 ALTER)
- `PageController`:
  - `PATCH /api/pages/{id}/favorite` — body `{favorite: boolean}` → 갱신된 Page DTO
  - `GET /api/pages/favorites` — 사용자의 즐겨찾기 페이지 목록 (제목순)
- `PageService.toggleFavorite(userId, pageId, value)` — 소유자 검증 후 `setFavorite(value)` save
- `PageService.getFavorites(userId)` — `favorite=true AND user=` 조회
- `PageRepository.findByUserAndFavoriteTrueOrderByTitleAsc(user)` 메서드 추가

## Data Model Changes

```sql
ALTER TABLE pages ADD COLUMN favorite BOOLEAN NOT NULL DEFAULT FALSE;
```

JPA가 자동으로 처리. 다른 스키마 변경 없음.

## Feature Designs

### 1. 다크모드

**팔레트** (GitHub Dark 기반)

```js
themes = {
  light: {
    bg: '#ffffff', sidebarBg: '#f7f6f3', border: '#e8e5de',
    text: '#2f2f2f', textMuted: '#787774', accent: '#2383e2',
    hoverBg: '#efefef', selectedBg: '#e8f0fe',
    inputBg: '#ffffff', shadow: '0 4px 12px rgba(0,0,0,.08)',
    danger: '#e03e3e'
  },
  dark: {
    bg: '#0d1117', sidebarBg: '#161b22', border: '#30363d',
    text: '#c9d1d9', textMuted: '#8b949e', accent: '#58a6ff',
    hoverBg: '#1f242c', selectedBg: '#1f6feb33',
    inputBg: '#0d1117', shadow: '0 4px 12px rgba(0,0,0,.5)',
    danger: '#f85149'
  }
}
```

**ThemeContext**
- 초기값: `localStorage.getItem('theme')`이 `'dark'`이면 dark, 그 외 light.
- `toggle()`: 모드 반전 + localStorage 저장.
- `useTheme()` 반환: `{ mode, toggle, colors }`.

**컴포넌트 변환 패턴**

기존:
```jsx
const styles = { sidebar: { background: '#f7f6f3', ... } };
```

변환 후:
```jsx
const { colors } = useTheme();
const styles = makeStyles(colors);
// 파일 하단:
const makeStyles = (c) => ({ sidebar: { background: c.sidebarBg, ... } });
```

`useMemo`로 colors 변경 시만 재계산 (옵션. 컴포넌트별 판단).

**토글 UI** — `Sidebar.jsx` 헤더의 사용자 이름 우측에 작은 아이콘 버튼. 라이트일 때 🌙, 다크일 때 ☀️. tooltip: "다크모드 (Ctrl+K → 토글)".

**Quill 에디터 다크 스타일** — Quill 자체는 클래스 기반 CSS를 사용하므로 inline 스타일 패턴이 안 통함. `ThemeProvider`가 mount될 때 `<style id="quill-dark-overrides">`를 `document.head`에 주입하고, `mode === 'dark'`일 때만 활성화하는 방식. 주요 셀렉터: `.ql-toolbar`, `.ql-container`, `.ql-editor`, `.ql-picker-options`, `.ql-stroke`, `.ql-fill`.

### 2. 커맨드 팔레트 + 즐겨찾기

#### 2a. 커맨드 팔레트

**컴포넌트 구조** (`CommandPalette.jsx`)
- 항상 마운트, 내부 상태 `open` boolean.
- 전역 핫키 `mod+k` (App.jsx에서 등록) → `setOpen(true)`.
- 입력 `query` 변경 시 두 그룹 필터링:
  - **빈 query**: 그룹 "최근 본 페이지" — `useRecentPages()` 훅이 반환하는 5개
  - **query 있음**: 그룹 "페이지" (pageTree에서 title 부분일치, lowercase) + 그룹 "액션" (액션 라벨 부분일치)
- 키보드: `↑↓` 선택 이동, `↵` 실행, `esc` 닫기. 선택된 아이템은 `selectedBg`로 하이라이트.

**액션 레지스트리**
```js
actions = [
  { id:'new-page',    label:'새 페이지 만들기',     icon:'➕', shortcut:'Ctrl+N', run: ctx => ctx.createPage() },
  { id:'new-tpl',     label:'템플릿으로 새 페이지', icon:'📋', run: ctx => ctx.createPageWithTemplate() },
  { id:'toggle-dark', label:'다크모드 토글',        icon:'🌙', run: ctx => ctx.toggleTheme() },
  { id:'logout',      label:'로그아웃',             icon:'🚪', run: ctx => ctx.logout() },
]
```
`ctx`는 CommandPalette 내부에서 `useAuth`, `usePageContext`, `useTheme`, `useNavigate`를 한데 모아 만든 객체.

**전역 핫키** (`hooks/useHotkey.js`)
- `useHotkey('mod+k', handler)`: 마운트 시 `document.addEventListener('keydown', ...)`, 언마운트 시 제거.
- `mod` = `navigator.platform`이 Mac이면 `metaKey`, 그 외 `ctrlKey`.
- 입력 필드에 포커스가 있어도 동작 (Ctrl+K는 브라우저 기본동작 preventDefault).
- Quill 에디터 내부에서도 동작해야 함 — `keydown`이 document 레벨까지 버블되는지 검증 필요. 안되면 Quill의 keyboard 모듈에 단축키 등록.

#### 2b. 최근 본 페이지

`hooks/useRecentPages.js`
- localStorage 키 `recentPages`: `[pageId, pageId, ...]` (최대 10 저장).
- `pushRecent(pageId)`: 중복 제거 후 앞으로 이동, 10개 초과 시 뒤에서 자름.
- `getRecent(limit=5)`: 앞에서 limit개 반환. `usePageContext`의 페이지 맵에서 객체 조회. 존재하지 않는 id는 스킵 + 정리.
- `PageDetailPage`의 useEffect에서 페이지 로드 직후 `pushRecent(id)` 호출.

#### 2c. 즐겨찾기

**백엔드**
- `Page` 엔티티에 `favorite` 필드 + getter/setter.
- `PageRepository.findByUserAndFavoriteTrueOrderByTitleAsc(User user)`.
- Page DTO (트리 응답에 사용 중인 것)에도 `favorite` 필드 노출. 프론트는 이 값으로 ☆/⭐ 상태 표시.
- `PageService`:
  - `toggleFavorite(Long userId, Long pageId, boolean value)`: 페이지 조회 → `page.getUser().getId().equals(userId)` 검증 (아니면 403) → `setFavorite(value)` → save → DTO 반환.
  - `getFavorites(Long userId)`: repository 호출, DTO 리스트 반환.
- `PageController` 엔드포인트 2개. 인증된 user는 `@AuthenticationPrincipal`에서 추출.

**프론트엔드**
- `api/pages.js`:
  - `toggleFavorite(id, favorite)` → PATCH
  - `getFavorites()` → GET
- `PageContext`에 `favorites` 배열 상태 추가. `refreshFavorites()` = `getFavorites()` 호출 후 setState. `refreshTree()` 호출 시 함께 호출.
- `Sidebar.jsx`:
  - 검색 입력 아래, 페이지 트리 위에 즐겨찾기 섹션.
  - 헤더 "⭐ 즐겨찾기" (개수 표시). `favorites.length === 0`이면 섹션 자체 숨김.
  - 각 항목 클릭 시 페이지 이동.
- `PageTreeNode.jsx`:
  - hover 시 우측에 ☆/⭐ 아이콘 버튼 노출 (CSS `opacity` 트랜지션).
  - 클릭 시 `toggleFavorite(node.id, !node.favorite)` 호출 → `refreshTree() + refreshFavorites()`.
- 페이지 노드는 트리와 즐겨찾기 섹션 모두에 표시될 수 있음 (Notion 동일).

### 3. 회의록 템플릿

**템플릿 데이터** (`templates/index.js`)

```js
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
      <ul data-checked="false"><li></li></ul>
    `.trim()
  },
  { id:'oneonone',  name:'1:1 미팅',    emoji:'👥', content: /* 일시/참석자 + 지난 액션 점검 / 이번 주 논의 / 다음 액션 / 피드백 */ },
  { id:'retro',     name:'회고 (KPT)',  emoji:'🔄', content: /* Keep h3 + ul / Problem h3 + ul / Try h3 + ul */ },
  { id:'kickoff',   name:'프로젝트 킥오프', emoji:'🚀', content: /* 목표 / 일정 / 참여자 / 주요 마일스톤 / 리스크 */ },
  { id:'standup',   name:'데일리 스탠드업', emoji:'☀️', content: /* 날짜 + 어제 한 일 / 오늘 할 일 / 블로커 */ },
  { id:'interview', name:'인터뷰 노트',  emoji:'🎤', content: /* 후보자 / 일시 / 평가 항목별 코멘트 / 결론 + 추천 여부 */ },
];
// 위 주석은 design 단계에서의 구조 요약. 실제 HTML 본문은 구현 단계에서 weekly 템플릿과 동일한 패턴으로 작성.
```

각 `content`는 Quill 호환 HTML. h2, h3, p, ul/ol, blockquote, strong 위주.

**TemplatePicker** (`components/TemplatePicker.jsx`)
- props: `onPick(template)`, `onClose()`, `mode: 'banner' | 'modal'`.
- **banner 모드** — 빈 페이지 본문 상단에 띠:
  > 💡 빈 페이지예요. 템플릿에서 시작하시겠어요?  [▾ 템플릿]
  - 버튼 클릭 시 드롭다운으로 6개 (이모지 + 이름) 렌더. 항목 클릭 → `onPick(template)`.
- **modal 모드** — 화면 중앙 모달. 커맨드 팔레트의 "템플릿으로 새 페이지" 액션이 빈 페이지 만든 직후 띄움.

**적용 로직** (`PageDetailPage`)
- `isEmpty(content)` = `content === '' || content === '<p><br></p>'`.
- 본문이 비어있을 때만 `<TemplatePicker mode="banner">` 렌더.
- 템플릿 선택 시:
  1. Quill 인스턴스에 `setContents` 또는 `clipboard.dangerouslyPasteHTML(template.content)` 호출.
  2. 현재 페이지의 `emoji`가 기본값(`📄`)일 때만 `template.emoji`로 교체 (사용자가 이미 바꿨다면 존중).
  3. 자동저장 트리거 (이미 있는 debounce 흐름에 의존).

## Cross-Cutting

### 키보드 단축키 목록 (사용자 가시)

| 키 | 동작 |
|---|---|
| `Ctrl+K` (Mac: `Cmd+K`) | 커맨드 팔레트 열기 |
| `Ctrl+N` | 새 페이지 (팔레트 액션 등록만, 일단 전역 핫키 X — 충돌 가능) |
| `Esc` | 팔레트/모달 닫기 |
| `↑↓` `↵` | 팔레트 내 선택/실행 |

`Ctrl+N`은 브라우저 새 창 단축키와 충돌하므로 팔레트 라벨에만 표시하고 전역 등록은 보류.

### 영향받지 않는 영역

- 인증 흐름 (JWT, refresh)
- 페이지 계층/이동/검색
- 태그 시스템
- 자동저장 디바운스 로직

## Testing

### 백엔드 (`gradlew test`)
- `PageServiceTest`:
  - `toggleFavorite_succeedsForOwner` — 소유자가 토글 시 favorite 변경됨.
  - `toggleFavorite_rejectsNonOwner` — 다른 사용자의 페이지 토글 시 예외.
  - `getFavorites_returnsOnlyOwnedFavorites` — 다른 사용자의 즐겨찾기 페이지는 결과에 없음.
- `PageControllerTest`:
  - `PATCH /api/pages/{id}/favorite` 200 (소유자), 403 (타인), 401 (미인증)
  - `GET /api/pages/favorites` 200, 결과 형식 검증

### 프론트엔드 (수동 E2E)
- 다크 토글 → 모든 화면 색상 전환 확인 → 새로고침 후에도 다크 유지
- Ctrl+K → 빈 상태에서 최근 페이지 표시 → "회" 입력 시 페이지+액션 필터
- 즐겨찾기 토글 → 사이드바 즐겨찾기 섹션에 추가/제거 → 새로고침 후 유지
- 빈 페이지 만들고 "주간 회의" 템플릿 선택 → 본문 채워짐, 이모지 변경됨, 자동저장 후 새로고침 시 유지
- 이미 내용 있는 페이지에선 템플릿 띠가 안 보임
- 라이트/다크 둘 다에서 Quill 툴바/본문이 가독성 OK

머신 제약상 `gradlew test`는 사용자가 직접 실행.

## Risks & Mitigations

| 리스크 | 완화책 |
|---|---|
| inline styles 8개 파일 일괄 변환 중 회귀 (특히 미세한 padding/border 누락) | 변환 후 라이트 모드에서 시각 회귀가 없는지 페이지마다 확인. 색상 외 값은 그대로 유지. |
| Quill 다크 스타일 누락된 셀렉터 (placeholder, blockquote 등) | 다크 모드 진입 후 에디터 모든 블록 요소 사용해보며 가독성 체크. 누락 발견 시 override 추가. |
| Ctrl+K가 Quill 에디터 포커스 중 동작 안 함 | Quill keyboard 모듈에 별도 등록. document level keydown 캡처 단계도 시도. |
| `recentPages` localStorage에 삭제된 페이지 id 잔존 | `getRecent`에서 페이지 맵 조회 실패 시 해당 id를 리스트에서 정리 후 반환. |
| 즐겨찾기 페이지가 트리에서 삭제됨 (즐겨찾기 섹션 stale) | 페이지 삭제 시 `refreshFavorites()` 호출. |

## Open Questions

없음. 모두 위에서 결정.

## Out of Scope (이번 스펙)

- 자동 다크모드 (system preference)
- 사용자 정의 템플릿 작성/저장
- 즐겨찾기 정렬/카테고리/태그
- 슬래시 명령 (`/template` 등 에디터 인라인)
- 페이지 미리보기 (커맨드 팔레트에서 호버 시 본문 일부 표시)
