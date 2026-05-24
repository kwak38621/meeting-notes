# Meeting Notes Web App — Design Spec
**Date:** 2026-04-04  
**Stack:** Spring Boot 3.x + React 18 + MySQL 8

---

## 1. Overview

Notion 스타일의 회의록 관리 웹 애플리케이션. 사용자별 독립된 워크스페이스에서 계층 구조로 회의록을 작성·관리한다. Rich Text 편집, 태그 분류, 전문 검색을 지원한다.

---

## 2. Architecture

```
[React SPA :3000]
      |  REST API (JSON) + JWT
[Spring Boot :8080]
      |  JPA (Hibernate)
[MySQL 8]
```

### 2.1 백엔드 패키지 구조

```
backend/
└── src/main/java/com/meetingnotes/
    ├── config/          # SecurityConfig, JwtConfig, CorsConfig
    ├── auth/            # AuthController, AuthService, JwtUtil
    ├── user/            # UserEntity, UserRepository, UserService
    ├── page/            # PageEntity, PageRepository, PageService, PageController
    ├── tag/             # TagEntity, TagRepository, TagService, TagController
    └── common/          # BaseEntity, ApiResponse, GlobalExceptionHandler
```

### 2.2 프론트엔드 구조

```
frontend/
└── src/
    ├── api/             # axios 인스턴스, auth.js, pages.js, tags.js
    ├── components/      # Sidebar, Editor, PageTree, TagBadge, SearchBar
    ├── pages/           # LoginPage, RegisterPage, WorkspacePage, PageDetailPage
    ├── context/         # AuthContext, PageContext
    └── utils/           # token.js (localStorage 관리)
```

---

## 3. Data Model

### User
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | |
| email | VARCHAR(255) UNIQUE | 로그인 ID |
| password | VARCHAR(255) | bcrypt 해시 |
| name | VARCHAR(100) | 표시 이름 |
| created_at | DATETIME | |

### Page
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | |
| title | VARCHAR(500) | 페이지 제목 |
| content | LONGTEXT | Quill Delta JSON |
| parent_id | BIGINT FK (self) | null이면 루트 페이지 |
| user_id | BIGINT FK | 소유자 |
| emoji | VARCHAR(10) | 페이지 아이콘 (선택) |
| sort_order | INT | 같은 레벨 내 정렬 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Tag
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(50) | |
| user_id | BIGINT FK | |

### PageTag (연결 테이블)
| 컬럼 | 타입 |
|---|---|
| page_id | BIGINT FK |
| tag_id | BIGINT FK |

---

## 4. API Endpoints

### 인증
| Method | Path | 설명 |
|---|---|---|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 → JWT 반환 |
| POST | /api/auth/refresh | Access Token 재발급 |

### 페이지
| Method | Path | 설명 |
|---|---|---|
| GET | /api/pages | 내 루트 페이지 목록 (트리 포함) |
| POST | /api/pages | 페이지 생성 |
| GET | /api/pages/{id} | 단일 페이지 조회 |
| PUT | /api/pages/{id} | 페이지 수정 |
| DELETE | /api/pages/{id} | 페이지 삭제 (자식도 cascade) |
| GET | /api/pages/search?q= | 제목+내용 전문 검색 |
| PATCH | /api/pages/{id}/move | 부모 변경 (drag & drop 지원) |

### 태그
| Method | Path | 설명 |
|---|---|---|
| GET | /api/tags | 내 태그 목록 |
| POST | /api/tags | 태그 생성 |
| DELETE | /api/tags/{id} | 태그 삭제 |
| GET | /api/pages?tagId= | 태그로 페이지 필터 |

---

## 5. 인증 흐름

1. 로그인 → Access Token (15분) + Refresh Token (7일) 반환
2. 프론트: Access Token은 메모리, Refresh Token은 httpOnly 쿠키
3. Access Token 만료 시 `/api/auth/refresh` 자동 호출
4. 모든 API 요청 헤더: `Authorization: Bearer <access_token>`

---

## 6. 핵심 UI 컴포넌트

### Sidebar
- 페이지 트리 (재귀 컴포넌트 `PageTreeNode`)
- 새 페이지 생성 버튼
- 태그 필터 섹션
- 하단: 사용자 프로필 + 로그아웃

### Editor (Quill.js)
- 제목 입력 (일반 input, 큰 폰트)
- 본문 Rich Text (Quill)
- 자동저장 (debounce 1.5초)
- 태그 추가/제거 (Chip UI)
- 이모지 선택기 (제목 왼쪽)

### SearchBar
- 헤더 상단 검색창
- 결과: 페이지 제목 + 내용 미리보기 (100자)

---

## 7. 에러 처리

- 백엔드: `GlobalExceptionHandler` (@ControllerAdvice) → 모든 에러를 `ApiResponse<Void>` 형식으로 통일
- 프론트: Axios 인터셉터에서 401 감지 → 토큰 갱신 시도 → 실패 시 로그인 페이지 리다이렉트

---

## 8. 보안

- Password: BCryptPasswordEncoder
- SQL Injection: JPA Parameterized Query
- XSS: Quill 출력 시 DOMPurify 적용
- CORS: Spring에서 `http://localhost:3000` 허용 (개발)

---

## 9. 개발 환경 설정

- Backend: `application.yml` — DB URL, JWT secret, 포트 8080
- Frontend: `.env` — `VITE_API_BASE_URL=http://localhost:8080`
- DB: Docker로 MySQL 8 컨테이너 실행 (`docker-compose.yml` 포함)
