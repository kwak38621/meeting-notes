# Meeting Notes

Notion 스타일의 계층형 노트 앱. 페이지 트리, 리치 텍스트 에디터, 태그, 명령 팔레트, 다크 테마, 템플릿을 지원합니다.

## 스택

- **Backend**: Spring Boot 3 · Java · JPA(Hibernate) · MySQL 8 · JWT 인증
- **Frontend**: React 18 · Vite · React Router · Quill · Axios
- **Infra**: Docker Compose (MySQL), Gradle

## 주요 기능

- 회원가입 / 로그인 (JWT access + refresh, 자동 갱신 인터셉터)
- 계층형 페이지 트리 (부모-자식, 이동, 순환 참조 방지)
- 리치 텍스트 에디터 (Quill + DOMPurify) + 1.5초 debounce 자동저장
- 태그 (chip + autocomplete, 페이지-태그 다대다)
- 명령 팔레트 (단축키, 최근 페이지, 템플릿에서 새 페이지)
- 다크/라이트 테마
- 페이지 템플릿 (회의록, 일일노트 등)

## 빠른 시작

### 0. 환경 변수 (.env 또는 셸에서)

```bash
export DB_USER=appuser
export DB_PASSWORD=apppass1234
export JWT_SECRET=$(openssl rand -base64 48)
# 선택: CORS_ORIGIN, DB_HOST
```

### 1. MySQL 기동 (Docker)

```bash
docker-compose up -d mysql
```

### 2. Backend

```bash
cd backend
./gradlew bootRun        # http://localhost:8080
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

## 테스트

```bash
cd backend
./gradlew test
```

## 디렉토리 구조

```
backend/   Spring Boot (auth, page, tag, user, common, config)
frontend/  React + Vite (api, components, context, hooks, pages, styles, templates)
docs/      플랜 및 디자인 스펙
```

## 보안 메모

- `application.yml`은 환경변수만 사용 — 기본값 없음
- 운영 배포 시 `JWT_SECRET`은 충분히 긴 랜덤 값으로 새로 생성할 것

## 라이선스

개인 프로젝트
