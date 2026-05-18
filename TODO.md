# Meeting Notes App — 구현 TODO

> **플랜 파일:** `docs/superpowers/plans/2026-04-04-meeting-notes.md`
> **마지막 업데이트:** 2026-05-18

---

## 완료

- [x] **Task 1** — 프로젝트 초기화 및 Docker Compose
- [x] **Task 2** — 공통 인프라 (BaseEntity, ApiResponse, GlobalExceptionHandler, JpaAuditingConfig)
- [x] **Task 3** — User 엔티티 + JWT 인증 (AuthServiceTest 6개 통과)
- [x] **Task 4** — Page 엔티티 + CRUD API
  - Page (계층형 self-referencing), PageRepository, DTOs (PageRequest/Response/TreeResponse)
  - PageService (create/get/update/delete/search/move) — **보안 강화 fix 포함**: 부모 페이지 권한 검증, `move` 순환 참조 차단
  - PageController (7 endpoints)
  - PageServiceTest 5개 (기본 2 + 보안 fix 3)
- [x] **Task 5** — Tag 엔티티 + API
  - Tag, TagRepository, dtos, TagService, TagController
  - Page.java에 `tags` ManyToMany 관계 추가, PageResponse에 tags 포함
  - PageService.addTag/removeTag (태그 소유자 교차 검증 포함)
- [x] **Task 6** — React 인증 UI
  - utils/token.js (인메모리 access token)
  - api/axios.js (401 refresh interceptor + 동시요청 큐)
  - api/auth.js, context/AuthContext.jsx
  - pages/LoginPage.jsx, RegisterPage.jsx
  - App.jsx (BrowserRouter + PrivateRoute), main.jsx
- [x] **Task 7** — Workspace 레이아웃 + Sidebar
  - api/pages.js, api/tags.js
  - context/PageContext.jsx
  - components/PageTreeNode.jsx (재귀, navigate 포함), Sidebar.jsx
  - pages/WorkspacePage.jsx (PageProvider + nested Routes)
- [x] **Task 8** — 에디터 + 페이지 상세 화면
  - components/Editor.jsx (Quill + DOMPurify)
  - components/TagInput.jsx (chip + autocomplete)
  - pages/PageDetailPage.jsx (자동저장 1.5초 debounce, 이모지 피커)

---

## 빌드 시스템: Gradle (2026-05-18 Maven에서 변환)

- ✅ 백엔드 단위 테스트 11/11 통과 (`./gradlew test`)

## 남은 작업 — Task 9 (사용자 수동 검증 필요)

- [ ] **통합 기동**
  - 터미널 1: `docker-compose up mysql`
  - 터미널 2: `cd backend && ./gradlew bootRun`
  - 터미널 3: `cd frontend && npm install && npm run dev`
- [ ] **수동 E2E 검증** (`http://localhost:3000`)
  1. 회원가입 → 로그인 → 워크스페이스 진입
  2. "새 페이지" → 사이드바에 노출
  3. 에디터에서 제목/내용 수정 → 1.5초 후 자동저장
  4. 태그 추가/제거, 이모지 변경
- [ ] **최종 커밋:** `git commit -m "chore: complete meeting notes app"`

## 최근 커밋 SHA

- `9c0d895` feat: page entity with hierarchy and CRUD API
- `50bb8e6` fix(page): parent ownership and cycle prevention in create/move
- `e0b8007` feat: tag entity with page-tag relationship and tag CRUD API
- `ef6c1f6` feat: auth UI (login/register) with JWT token management
- `5e0b80b` feat: workspace layout with Notion-style sidebar and page tree
- `e57c5f8` feat: page editor with Quill rich text, auto-save, tag input, and emoji picker
