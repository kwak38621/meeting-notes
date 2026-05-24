# Meeting Notes Web App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion 스타일의 회의록 관리 웹앱을 Spring Boot + React + MySQL로 구축한다.

**Architecture:** Spring Boot 3 REST API 서버(포트 8080)와 React SPA(포트 3000)를 분리 운영. JWT(Access 15분/Refresh 7일)로 인증, MySQL 8을 JPA로 접근. 계층형 Page 구조(self-referencing FK)로 Notion 스타일 사이드바를 구현.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Security 6, Spring Data JPA, MySQL 8, JJWT 0.12, React 18, Vite, React Router 6, Axios, Quill.js, Docker Compose

---

## File Map

### Backend (`backend/`)
```
src/main/java/com/meetingnotes/
├── MeetingNotesApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   └── JwtConfig.java
├── common/
│   ├── ApiResponse.java
│   ├── BaseEntity.java
│   └── GlobalExceptionHandler.java
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── JwtUtil.java
│   ├── JwtAuthenticationFilter.java
│   └── dto/
│       ├── LoginRequest.java
│       ├── RegisterRequest.java
│       └── AuthResponse.java
├── user/
│   ├── User.java
│   ├── UserRepository.java
│   └── UserDetailsServiceImpl.java
├── page/
│   ├── Page.java
│   ├── PageRepository.java
│   ├── PageService.java
│   ├── PageController.java
│   └── dto/
│       ├── PageRequest.java
│       ├── PageResponse.java
│       └── PageTreeResponse.java
└── tag/
    ├── Tag.java
    ├── TagRepository.java
    ├── TagService.java
    ├── TagController.java
    └── dto/
        ├── TagRequest.java
        └── TagResponse.java

src/main/resources/
├── application.yml
└── schema.sql (초기 테이블 — JPA ddl-auto=validate용)

src/test/java/com/meetingnotes/
├── auth/AuthServiceTest.java
├── page/PageServiceTest.java
└── tag/TagServiceTest.java
```

### Frontend (`frontend/`)
```
src/
├── main.jsx
├── App.jsx
├── api/
│   ├── axios.js          # 인터셉터 + 토큰 갱신
│   ├── auth.js
│   ├── pages.js
│   └── tags.js
├── context/
│   ├── AuthContext.jsx
│   └── PageContext.jsx
├── components/
│   ├── Sidebar.jsx
│   ├── PageTreeNode.jsx   # 재귀 트리 아이템
│   ├── Editor.jsx         # Quill 래퍼
│   ├── TagInput.jsx
│   └── SearchBar.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── WorkspacePage.jsx  # 메인 레이아웃
│   └── PageDetailPage.jsx
└── utils/
    └── token.js          # Access Token 인메모리 관리
```

### 루트
```
docker-compose.yml
backend/pom.xml
frontend/package.json
frontend/.env
frontend/vite.config.js
```

---

## Task 1: 프로젝트 초기화 및 Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/pom.xml`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/java/com/meetingnotes/MeetingNotesApplication.java`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/.env`

- [ ] **Step 1: Docker Compose 작성**

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: meeting-notes-db
    environment:
      MYSQL_ROOT_PASSWORD: root1234
      MYSQL_DATABASE: meeting_notes
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppass1234
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

- [ ] **Step 2: MySQL 컨테이너 기동 확인**

```bash
docker-compose up -d mysql
docker-compose ps
```

Expected: `meeting-notes-db` 상태가 `Up`

- [ ] **Step 3: Spring Boot 프로젝트 생성**

[Spring Initializr](https://start.spring.io) 또는 Maven 직접 생성.  
`backend/pom.xml` 핵심 의존성:

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.2.4</version>
</parent>

<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>
  <dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.5</version>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.5</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
```

- [ ] **Step 4: application.yml 작성**

```yaml
# backend/src/main/resources/application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/meeting_notes?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
    username: appuser
    password: apppass1234
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQL8Dialect

server:
  port: 8080

jwt:
  secret: "meetingNotesSecretKey2026!@#$%^&*()SuperLongSecretForHS256Algorithm"
  access-token-expiry: 900000      # 15분 (ms)
  refresh-token-expiry: 604800000  # 7일 (ms)
```

- [ ] **Step 5: MeetingNotesApplication.java 작성**

```java
// backend/src/main/java/com/meetingnotes/MeetingNotesApplication.java
package com.meetingnotes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MeetingNotesApplication {
    public static void main(String[] args) {
        SpringApplication.run(MeetingNotesApplication.class, args);
    }
}
```

- [ ] **Step 6: React 프로젝트 생성**

```bash
cd c:/project/project1_
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios react-router-dom quill dompurify
npm install -D @vitejs/plugin-react
```

- [ ] **Step 7: vite.config.js 수정 (프록시 설정)**

```js
// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

- [ ] **Step 8: .env 작성**

```
# frontend/.env
VITE_API_BASE_URL=/api
```

- [ ] **Step 9: 커밋**

```bash
git init
git add .
git commit -m "chore: initial project scaffold (Spring Boot + React + Docker Compose)"
```

---

## Task 2: 공통 인프라 — BaseEntity, ApiResponse, GlobalExceptionHandler

**Files:**
- Create: `backend/src/main/java/com/meetingnotes/common/BaseEntity.java`
- Create: `backend/src/main/java/com/meetingnotes/common/ApiResponse.java`
- Create: `backend/src/main/java/com/meetingnotes/common/GlobalExceptionHandler.java`

- [ ] **Step 1: BaseEntity 작성**

```java
// common/BaseEntity.java
package com.meetingnotes.common;

import jakarta.persistence.*;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 2: MeetingNotesApplication에 @EnableJpaAuditing 추가**

```java
package com.meetingnotes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class MeetingNotesApplication {
    public static void main(String[] args) {
        SpringApplication.run(MeetingNotesApplication.class, args);
    }
}
```

- [ ] **Step 3: ApiResponse 작성**

```java
// common/ApiResponse.java
package com.meetingnotes.common;

import lombok.Getter;

@Getter
public class ApiResponse<T> {
    private final boolean success;
    private final String message;
    private final T data;

    private ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "OK", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static ApiResponse<Void> fail(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
```

- [ ] **Step 4: GlobalExceptionHandler 작성**

```java
// common/GlobalExceptionHandler.java
package com.meetingnotes.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.fail("접근 권한이 없습니다."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        return ResponseEntity.badRequest().body(ApiResponse.fail(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception e) {
        return ResponseEntity.internalServerError().body(ApiResponse.fail("서버 오류가 발생했습니다."));
    }
}
```

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/common/
git commit -m "feat: add common infrastructure (BaseEntity, ApiResponse, GlobalExceptionHandler)"
```

---

## Task 3: User 엔티티 + JWT 인증

**Files:**
- Create: `backend/src/main/java/com/meetingnotes/user/User.java`
- Create: `backend/src/main/java/com/meetingnotes/user/UserRepository.java`
- Create: `backend/src/main/java/com/meetingnotes/user/UserDetailsServiceImpl.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/JwtUtil.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/dto/LoginRequest.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/dto/RegisterRequest.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/dto/AuthResponse.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/AuthService.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/JwtAuthenticationFilter.java`
- Create: `backend/src/main/java/com/meetingnotes/config/SecurityConfig.java`
- Create: `backend/src/main/java/com/meetingnotes/config/JwtConfig.java`
- Create: `backend/src/main/java/com/meetingnotes/config/CorsConfig.java`
- Create: `backend/src/main/java/com/meetingnotes/auth/AuthController.java`
- Test: `backend/src/test/java/com/meetingnotes/auth/AuthServiceTest.java`

- [ ] **Step 1: User 엔티티 작성**

```java
// user/User.java
package com.meetingnotes.user;

import com.meetingnotes.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 100)
    private String name;

    @Builder
    public User(String email, String password, String name) {
        this.email = email;
        this.password = password;
        this.name = name;
    }
}
```

- [ ] **Step 2: UserRepository 작성**

```java
// user/UserRepository.java
package com.meetingnotes.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

- [ ] **Step 3: UserDetailsServiceImpl 작성**

```java
// user/UserDetailsServiceImpl.java
package com.meetingnotes.user;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + email));
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPassword())
            .roles("USER")
            .build();
    }
}
```

- [ ] **Step 4: JwtConfig 작성**

```java
// config/JwtConfig.java
package com.meetingnotes.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class JwtConfig {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiry}")
    private long accessTokenExpiry;

    @Value("${jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;
}
```

- [ ] **Step 5: JwtUtil 작성**

```java
// auth/JwtUtil.java
package com.meetingnotes.auth;

import com.meetingnotes.config.JwtConfig;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final JwtConfig jwtConfig;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String email) {
        return buildToken(email, jwtConfig.getAccessTokenExpiry());
    }

    public String generateRefreshToken(String email) {
        return buildToken(email, jwtConfig.getRefreshTokenExpiry());
    }

    private String buildToken(String subject, long expiryMs) {
        return Jwts.builder()
            .subject(subject)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiryMs))
            .signWith(getKey())
            .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(getKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
```

- [ ] **Step 6: AuthService 테스트 먼저 작성 (TDD)**

```java
// test/auth/AuthServiceTest.java
package com.meetingnotes.auth;

import com.meetingnotes.auth.dto.LoginRequest;
import com.meetingnotes.auth.dto.RegisterRequest;
import com.meetingnotes.auth.dto.AuthResponse;
import com.meetingnotes.config.JwtConfig;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock JwtUtil jwtUtil;
    @InjectMocks AuthService authService;

    @Test
    void register_성공() {
        RegisterRequest req = new RegisterRequest("test@test.com", "password123", "홍길동");
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        assertThatCode(() -> authService.register(req)).doesNotThrowAnyException();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_이메일_중복_예외() {
        RegisterRequest req = new RegisterRequest("test@test.com", "password123", "홍길동");
        when(userRepository.existsByEmail("test@test.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("이미 사용 중인 이메일");
    }

    @Test
    void login_성공() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        User user = User.builder()
            .email("test@test.com")
            .password(encoder.encode("password123"))
            .name("홍길동").build();

        LoginRequest req = new LoginRequest("test@test.com", "password123");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateAccessToken("test@test.com")).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken("test@test.com")).thenReturn("refresh-token");

        AuthResponse response = authService.login(req);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void login_비밀번호_불일치_예외() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        User user = User.builder()
            .email("test@test.com")
            .password(encoder.encode("password123"))
            .name("홍길동").build();

        LoginRequest req = new LoginRequest("test@test.com", "wrongpassword");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("비밀번호");
    }
}
```

- [ ] **Step 7: 테스트 실행 — FAIL 확인**

```bash
cd backend
mvn test -pl . -Dtest=AuthServiceTest
```

Expected: `AuthService` 클래스 없음으로 컴파일 에러

- [ ] **Step 8: DTO 클래스 작성**

```java
// auth/dto/RegisterRequest.java
package com.meetingnotes.auth.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password,
    @NotBlank @Size(max = 100) String name
) {}
```

```java
// auth/dto/LoginRequest.java
package com.meetingnotes.auth.dto;

import jakarta.validation.constraints.*;

public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password
) {}
```

```java
// auth/dto/AuthResponse.java
package com.meetingnotes.auth.dto;

public record AuthResponse(String accessToken, String refreshToken, String name) {}
```

- [ ] **Step 9: AuthService 구현**

```java
// auth/AuthService.java
package com.meetingnotes.auth;

import com.meetingnotes.auth.dto.*;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public void register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }
        User user = User.builder()
            .email(req.email())
            .password(passwordEncoder.encode(req.password()))
            .name(req.name())
            .build();
        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다."));
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        return new AuthResponse(
            jwtUtil.generateAccessToken(user.getEmail()),
            jwtUtil.generateRefreshToken(user.getEmail()),
            user.getName()
        );
    }

    public AuthResponse refresh(String refreshToken) {
        if (!jwtUtil.isValid(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 Refresh Token입니다.");
        }
        String email = jwtUtil.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return new AuthResponse(
            jwtUtil.generateAccessToken(email),
            jwtUtil.generateRefreshToken(email),
            user.getName()
        );
    }
}
```

- [ ] **Step 10: JwtAuthenticationFilter 작성**

```java
// auth/JwtAuthenticationFilter.java
package com.meetingnotes.auth;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && jwtUtil.isValid(token)) {
            String email = jwtUtil.extractEmail(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

- [ ] **Step 11: SecurityConfig 작성**

```java
// config/SecurityConfig.java
package com.meetingnotes.config;

import com.meetingnotes.auth.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

- [ ] **Step 12: CorsConfig 작성**

```java
// config/CorsConfig.java
package com.meetingnotes.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.*;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOrigin("http://localhost:3000");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
```

- [ ] **Step 13: AuthController 작성**

```java
// auth/AuthController.java
package com.meetingnotes.auth;

import com.meetingnotes.auth.dto.*;
import com.meetingnotes.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest req) {
        authService.register(req);
        return ResponseEntity.ok(ApiResponse.ok("회원가입이 완료되었습니다.", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse response = authService.login(req);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody String refreshToken) {
        AuthResponse response = authService.refresh(refreshToken.trim());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
```

- [ ] **Step 14: 테스트 실행 — PASS 확인**

```bash
cd backend
mvn test -Dtest=AuthServiceTest
```

Expected: 4개 테스트 모두 PASS

- [ ] **Step 15: 백엔드 기동 확인**

```bash
mvn spring-boot:run
```

Expected: `Tomcat started on port 8080`

- [ ] **Step 16: 커밋**

```bash
git add backend/src/
git commit -m "feat: user entity, JWT auth (register/login/refresh endpoints)"
```

---

## Task 4: Page 엔티티 + CRUD API

**Files:**
- Create: `backend/src/main/java/com/meetingnotes/page/Page.java`
- Create: `backend/src/main/java/com/meetingnotes/page/PageRepository.java`
- Create: `backend/src/main/java/com/meetingnotes/page/dto/PageRequest.java`
- Create: `backend/src/main/java/com/meetingnotes/page/dto/PageResponse.java`
- Create: `backend/src/main/java/com/meetingnotes/page/dto/PageTreeResponse.java`
- Create: `backend/src/main/java/com/meetingnotes/page/PageService.java`
- Create: `backend/src/main/java/com/meetingnotes/page/PageController.java`
- Test: `backend/src/test/java/com/meetingnotes/page/PageServiceTest.java`

- [ ] **Step 1: Page 엔티티 작성**

```java
// page/Page.java
package com.meetingnotes.page;

import com.meetingnotes.common.BaseEntity;
import com.meetingnotes.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Page extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Page parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<Page> children = new ArrayList<>();

    @Column(length = 10)
    private String emoji;

    @Column(name = "sort_order")
    private int sortOrder;

    @Builder
    public Page(String title, String content, User user, Page parent, String emoji, int sortOrder) {
        this.title = title;
        this.content = content;
        this.user = user;
        this.parent = parent;
        this.emoji = emoji;
        this.sortOrder = sortOrder;
    }

    public void update(String title, String content, String emoji) {
        this.title = title;
        this.content = content;
        this.emoji = emoji;
    }

    public void setParent(Page parent) {
        this.parent = parent;
    }
}
```

- [ ] **Step 2: PageRepository 작성**

```java
// page/PageRepository.java
package com.meetingnotes.page;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PageRepository extends JpaRepository<Page, Long> {

    // 루트 페이지 (parent 없음) 목록
    List<Page> findByUserIdAndParentIsNullOrderBySortOrderAsc(Long userId);

    // 전문 검색
    @Query("SELECT p FROM Page p WHERE p.user.id = :userId AND (p.title LIKE %:q% OR p.content LIKE %:q%)")
    List<Page> searchByKeyword(@Param("userId") Long userId, @Param("q") String q);
}
```

- [ ] **Step 3: DTO 작성**

```java
// page/dto/PageRequest.java
package com.meetingnotes.page.dto;

import jakarta.validation.constraints.*;

public record PageRequest(
    @NotBlank @Size(max = 500) String title,
    String content,
    Long parentId,
    String emoji
) {}
```

```java
// page/dto/PageResponse.java
package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import java.time.LocalDateTime;

public record PageResponse(
    Long id,
    String title,
    String content,
    Long parentId,
    String emoji,
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
            page.getCreatedAt(),
            page.getUpdatedAt()
        );
    }
}
```

```java
// page/dto/PageTreeResponse.java
package com.meetingnotes.page.dto;

import com.meetingnotes.page.Page;
import java.util.List;

public record PageTreeResponse(
    Long id,
    String title,
    String emoji,
    List<PageTreeResponse> children
) {
    public static PageTreeResponse from(Page page) {
        return new PageTreeResponse(
            page.getId(),
            page.getTitle(),
            page.getEmoji(),
            page.getChildren().stream().map(PageTreeResponse::from).toList()
        );
    }
}
```

- [ ] **Step 4: PageService 테스트 작성 (TDD)**

```java
// test/page/PageServiceTest.java
package com.meetingnotes.page;

import com.meetingnotes.page.dto.PageRequest;
import com.meetingnotes.page.dto.PageResponse;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
}
```

- [ ] **Step 5: 테스트 실행 — FAIL 확인**

```bash
cd backend && mvn test -Dtest=PageServiceTest
```

Expected: 컴파일 에러 (PageService 없음)

- [ ] **Step 6: PageService 구현**

```java
// page/PageService.java
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
```

- [ ] **Step 7: PageController 작성**

```java
// page/PageController.java
package com.meetingnotes.page;

import com.meetingnotes.common.ApiResponse;
import com.meetingnotes.page.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PageTreeResponse>>> getTree(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.getTree(user.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PageResponse>> create(
            @Valid @RequestBody PageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.create(req, user.getUsername())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PageResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.get(id, user.getUsername())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PageResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody PageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.update(id, req, user.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        pageService.delete(id, user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<PageResponse>>> search(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.search(q, user.getUsername())));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<ApiResponse<PageResponse>> move(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(pageService.move(id, body.get("parentId"), user.getUsername())));
    }
}
```

- [ ] **Step 8: 테스트 실행 — PASS 확인**

```bash
cd backend && mvn test -Dtest=PageServiceTest
```

Expected: 2개 테스트 PASS

- [ ] **Step 9: 커밋**

```bash
git add backend/src/main/java/com/meetingnotes/page/ backend/src/test/java/com/meetingnotes/page/
git commit -m "feat: page entity with hierarchy and CRUD API"
```

---

## Task 5: Tag 엔티티 + API

**Files:**
- Create: `backend/src/main/java/com/meetingnotes/tag/Tag.java`
- Create: `backend/src/main/java/com/meetingnotes/tag/TagRepository.java`
- Create: `backend/src/main/java/com/meetingnotes/tag/dto/TagRequest.java`
- Create: `backend/src/main/java/com/meetingnotes/tag/dto/TagResponse.java`
- Create: `backend/src/main/java/com/meetingnotes/tag/TagService.java`
- Create: `backend/src/main/java/com/meetingnotes/tag/TagController.java`
- Modify: `backend/src/main/java/com/meetingnotes/page/Page.java` (태그 연관관계 추가)
- Modify: `backend/src/main/java/com/meetingnotes/page/PageService.java` (태그 추가/제거 기능)

- [ ] **Step 1: Tag 엔티티 작성**

```java
// tag/Tag.java
package com.meetingnotes.tag;

import com.meetingnotes.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tags", uniqueConstraints = @UniqueConstraint(columnNames = {"name", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder
    public Tag(String name, User user) {
        this.name = name;
        this.user = user;
    }
}
```

- [ ] **Step 2: Page 엔티티에 태그 연관관계 추가**

기존 `page/Page.java`에 다음 필드 추가 (기존 필드 유지):

```java
// Page.java 에 추가할 필드
@ManyToMany(fetch = FetchType.LAZY)
@JoinTable(
    name = "page_tags",
    joinColumns = @JoinColumn(name = "page_id"),
    inverseJoinColumns = @JoinColumn(name = "tag_id")
)
private List<Tag> tags = new ArrayList<>();

// 추가할 메서드
public void addTag(Tag tag) {
    if (!tags.contains(tag)) tags.add(tag);
}

public void removeTag(Tag tag) {
    tags.remove(tag);
}
```

`com.meetingnotes.tag.Tag` import도 추가.

- [ ] **Step 3: PageResponse에 태그 목록 추가**

```java
// page/dto/PageResponse.java — 전체 교체
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
            page.getTags().stream().map(TagResponse::from).toList(),
            page.getCreatedAt(),
            page.getUpdatedAt()
        );
    }
}
```

- [ ] **Step 4: DTO + Repository + Service + Controller 작성**

```java
// tag/dto/TagRequest.java
package com.meetingnotes.tag.dto;
import jakarta.validation.constraints.*;
public record TagRequest(@NotBlank @Size(max = 50) String name) {}
```

```java
// tag/dto/TagResponse.java
package com.meetingnotes.tag.dto;
import com.meetingnotes.tag.Tag;
public record TagResponse(Long id, String name) {
    public static TagResponse from(Tag tag) {
        return new TagResponse(tag.getId(), tag.getName());
    }
}
```

```java
// tag/TagRepository.java
package com.meetingnotes.tag;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findByUserId(Long userId);
    Optional<Tag> findByNameAndUserId(String name, Long userId);
}
```

```java
// tag/TagService.java
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
```

```java
// tag/TagController.java
package com.meetingnotes.tag;

import com.meetingnotes.common.ApiResponse;
import com.meetingnotes.tag.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagResponse>>> getAll(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.getAll(user.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TagResponse>> create(
            @Valid @RequestBody TagRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.create(req, user.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        tagService.delete(id, user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
```

- [ ] **Step 5: PageService에 태그 기능 추가**

`PageService.java`에 다음 의존성과 메서드 추가:

```java
// PageService.java 상단 field 추가
private final TagRepository tagRepository; // @RequiredArgsConstructor가 자동 주입

// 새 메서드 추가
public PageResponse addTag(Long pageId, Long tagId, String email) {
    Page page = getPageOwned(pageId, email);
    Tag tag = tagRepository.findById(tagId)
        .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없습니다."));
    page.addTag(tag);
    return PageResponse.from(page);
}

public PageResponse removeTag(Long pageId, Long tagId, String email) {
    Page page = getPageOwned(pageId, email);
    Tag tag = tagRepository.findById(tagId)
        .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없습니다."));
    page.removeTag(tag);
    return PageResponse.from(page);
}
```

`PageController.java`에 엔드포인트 추가:

```java
@PostMapping("/{pageId}/tags/{tagId}")
public ResponseEntity<ApiResponse<PageResponse>> addTag(
        @PathVariable Long pageId, @PathVariable Long tagId,
        @AuthenticationPrincipal UserDetails user) {
    return ResponseEntity.ok(ApiResponse.ok(pageService.addTag(pageId, tagId, user.getUsername())));
}

@DeleteMapping("/{pageId}/tags/{tagId}")
public ResponseEntity<ApiResponse<PageResponse>> removeTag(
        @PathVariable Long pageId, @PathVariable Long tagId,
        @AuthenticationPrincipal UserDetails user) {
    return ResponseEntity.ok(ApiResponse.ok(pageService.removeTag(pageId, tagId, user.getUsername())));
}
```

- [ ] **Step 6: 전체 테스트 실행**

```bash
cd backend && mvn test
```

Expected: 전체 PASS

- [ ] **Step 7: 커밋**

```bash
git add backend/src/
git commit -m "feat: tag entity with page-tag relationship and tag CRUD API"
```

---

## Task 6: React 기반 인증 UI (Login/Register)

**Files:**
- Create: `frontend/src/api/axios.js`
- Create: `frontend/src/api/auth.js`
- Create: `frontend/src/utils/token.js`
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/pages/LoginPage.jsx`
- Create: `frontend/src/pages/RegisterPage.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: token.js 작성 (인메모리 토큰 관리)**

```js
// frontend/src/utils/token.js
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };
```

- [ ] **Step 2: axios.js 작성 (인터셉터 포함)**

```js
// frontend/src/api/axios.js
import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let waitQueue = [];

const processQueue = (error, token = null) => {
  waitQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  waitQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post('/api/auth/refresh', refreshToken, {
          headers: { 'Content-Type': 'text/plain' },
        });
        const newAccess = res.data.data.accessToken;
        const newRefresh = res.data.data.refreshToken;
        setAccessToken(newAccess);
        localStorage.setItem('refreshToken', newRefresh);
        processQueue(null, newAccess);
        original.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        clearAccessToken();
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 3: auth.js API 함수 작성**

```js
// frontend/src/api/auth.js
import api from './axios';

export const register = (email, password, name) =>
  api.post('/auth/register', { email, password, name });

export const login = (email, password) =>
  api.post('/auth/login', { email, password });
```

- [ ] **Step 4: AuthContext 작성**

```jsx
// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, clearAccessToken } from '../utils/token';
import { login as loginApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRefresh = localStorage.getItem('refreshToken');
    const savedName = localStorage.getItem('userName');
    if (savedRefresh && savedName) {
      setUser({ name: savedName });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await loginApi(email, password);
    const { accessToken, refreshToken, name } = res.data.data;
    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userName', name);
    setUser({ name });
  };

  const logout = () => {
    clearAccessToken();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userName');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 5: LoginPage 작성**

```jsx
// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📋 Meeting Notes</h1>
        <h2 style={styles.subtitle}>로그인</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit">로그인</button>
        </form>
        <p style={styles.link}>
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f7f6f3' },
  card: { background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '360px' },
  title: { fontSize: '24px', marginBottom: '8px', color: '#1a1a1a' },
  subtitle: { fontSize: '18px', marginBottom: '24px', color: '#555', fontWeight: 'normal' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', outline: 'none' },
  button: { padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' },
  error: { color: '#ef4444', fontSize: '13px', marginBottom: '8px' },
  link: { textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#666' },
};
```

- [ ] **Step 6: RegisterPage 작성**

```jsx
// frontend/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.email, form.password, form.name);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📋 Meeting Notes</h1>
        <h2 style={styles.subtitle}>회원가입</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} name="name" placeholder="이름" value={form.name} onChange={handleChange} required />
          <input style={styles.input} name="email" type="email" placeholder="이메일" value={form.email} onChange={handleChange} required />
          <input style={styles.input} name="password" type="password" placeholder="비밀번호 (6자 이상)" value={form.password} onChange={handleChange} required minLength={6} />
          <button style={styles.button} type="submit">회원가입</button>
        </form>
        <p style={styles.link}>이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f7f6f3' },
  card: { background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '360px' },
  title: { fontSize: '24px', marginBottom: '8px', color: '#1a1a1a' },
  subtitle: { fontSize: '18px', marginBottom: '24px', color: '#555', fontWeight: 'normal' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', outline: 'none' },
  button: { padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' },
  error: { color: '#ef4444', fontSize: '13px', marginBottom: '8px' },
  link: { textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#666' },
};
```

- [ ] **Step 7: App.jsx와 main.jsx 작성**

```jsx
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

```jsx
// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/
git commit -m "feat: auth UI (login/register) with JWT token management"
```

---

## Task 7: Workspace 레이아웃 + Sidebar

**Files:**
- Create: `frontend/src/api/pages.js`
- Create: `frontend/src/api/tags.js`
- Create: `frontend/src/context/PageContext.jsx`
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/PageTreeNode.jsx`
- Create: `frontend/src/pages/WorkspacePage.jsx`

- [ ] **Step 1: pages.js API 함수 작성**

```js
// frontend/src/api/pages.js
import api from './axios';

export const getPageTree = () => api.get('/pages');
export const getPage = (id) => api.get(`/pages/${id}`);
export const createPage = (data) => api.post('/pages', data);
export const updatePage = (id, data) => api.put(`/pages/${id}`, data);
export const deletePage = (id) => api.delete(`/pages/${id}`);
export const searchPages = (q) => api.get('/pages/search', { params: { q } });
export const movePage = (id, parentId) => api.patch(`/pages/${id}/move`, { parentId });
export const addTag = (pageId, tagId) => api.post(`/pages/${pageId}/tags/${tagId}`);
export const removeTag = (pageId, tagId) => api.delete(`/pages/${pageId}/tags/${tagId}`);
```

- [ ] **Step 2: tags.js API 함수 작성**

```js
// frontend/src/api/tags.js
import api from './axios';

export const getTags = () => api.get('/tags');
export const createTag = (name) => api.post('/tags', { name });
export const deleteTag = (id) => api.delete(`/tags/${id}`);
```

- [ ] **Step 3: PageContext 작성**

```jsx
// frontend/src/context/PageContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { getPageTree } from '../api/pages';

const PageContext = createContext(null);

export function PageProvider({ children }) {
  const [pageTree, setPageTree] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);

  const refreshTree = useCallback(async () => {
    const res = await getPageTree();
    setPageTree(res.data.data);
  }, []);

  return (
    <PageContext.Provider value={{ pageTree, refreshTree, selectedPageId, setSelectedPageId }}>
      {children}
    </PageContext.Provider>
  );
}

export const usePageContext = () => useContext(PageContext);
```

- [ ] **Step 4: PageTreeNode 컴포넌트 작성 (재귀)**

```jsx
// frontend/src/components/PageTreeNode.jsx
import { useState } from 'react';
import { usePageContext } from '../context/PageContext';

export default function PageTreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const { selectedPageId, setSelectedPageId } = usePageContext();
  const isSelected = selectedPageId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          paddingLeft: `${16 + depth * 16}px`,
          cursor: 'pointer',
          background: isSelected ? '#e8e5de' : 'transparent',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#1a1a1a',
        }}
        onClick={() => setSelectedPageId(node.id)}
      >
        {hasChildren && (
          <span
            style={{ marginRight: '4px', fontSize: '10px', userSelect: 'none' }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ marginRight: '4px', width: '14px', display: 'inline-block' }} />}
        <span style={{ marginRight: '6px' }}>{node.emoji || '📄'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title}
        </span>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <PageTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Sidebar 컴포넌트 작성**

```jsx
// frontend/src/components/Sidebar.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePageContext } from '../context/PageContext';
import { createPage } from '../api/pages';
import PageTreeNode from './PageTreeNode';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pageTree, refreshTree } = usePageContext();
  const [search, setSearch] = useState('');

  useEffect(() => { refreshTree(); }, [refreshTree]);

  const handleNewPage = async () => {
    await createPage({ title: '새 페이지', content: '', emoji: '📄' });
    await refreshTree();
  };

  const filtered = search
    ? pageTree.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : pageTree;

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.logo}>📋</span>
        <span style={styles.userName}>{user?.name}</span>
      </div>
      <input
        style={styles.search}
        placeholder="페이지 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={styles.tree}>
        {filtered.map((node) => (
          <PageTreeNode key={node.id} node={node} />
        ))}
      </div>
      <div style={styles.footer}>
        <button style={styles.newPageBtn} onClick={handleNewPage}>+ 새 페이지</button>
        <button style={styles.logoutBtn} onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: '240px', height: '100vh', background: '#f7f6f3', borderRight: '1px solid #e8e5de', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  header: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e8e5de' },
  logo: { fontSize: '20px' },
  userName: { fontSize: '14px', fontWeight: '600', color: '#1a1a1a' },
  search: { margin: '8px', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', outline: 'none' },
  tree: { flex: 1, overflowY: 'auto', padding: '4px' },
  footer: { padding: '12px', borderTop: '1px solid #e8e5de', display: 'flex', flexDirection: 'column', gap: '8px' },
  newPageBtn: { padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  logoutBtn: { padding: '8px', background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
};
```

- [ ] **Step 6: WorkspacePage 작성**

```jsx
// frontend/src/pages/WorkspacePage.jsx
import { Routes, Route } from 'react-router-dom';
import { PageProvider } from '../context/PageContext';
import Sidebar from '../components/Sidebar';
import PageDetailPage from './PageDetailPage';

export default function WorkspacePage() {
  return (
    <PageProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<EmptyState />} />
            <Route path="/pages/:id" element={<PageDetailPage />} />
          </Routes>
        </div>
      </div>
    </PageProvider>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '48px' }}>📋</span>
      <p>왼쪽 사이드바에서 페이지를 선택하거나 새 페이지를 만드세요.</p>
    </div>
  );
}
```

- [ ] **Step 7: App.jsx 라우팅 수정 (PageDetail 경로 포함)**

`App.jsx`의 `WorkspacePage` 라우트를 다음으로 교체:

```jsx
<Route path="/*" element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
```

WorkspacePage 내부에서 중첩 라우팅을 처리하므로 변경 없음. 단, 사이드바 클릭 시 페이지 이동하도록 PageTreeNode 수정:

```jsx
// PageTreeNode.jsx — onClick 수정
import { useNavigate } from 'react-router-dom';

// 컴포넌트 안에서
const navigate = useNavigate();

// div onClick 수정
onClick={() => {
  setSelectedPageId(node.id);
  navigate(`/pages/${node.id}`);
}}
```

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/
git commit -m "feat: workspace layout with Notion-style sidebar and page tree"
```

---

## Task 8: 에디터 + 페이지 상세 화면

**Files:**
- Create: `frontend/src/components/Editor.jsx`
- Create: `frontend/src/components/TagInput.jsx`
- Create: `frontend/src/pages/PageDetailPage.jsx`

- [ ] **Step 1: Editor 컴포넌트 작성 (Quill.js)**

```jsx
// frontend/src/components/Editor.jsx
import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

export default function Editor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (quillRef.current) return;
    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: '내용을 입력하세요...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean'],
        ],
      },
    });

    quill.on('text-change', () => {
      const html = DOMPurify.sanitize(quill.root.innerHTML);
      onChangeRef.current(html);
    });

    quillRef.current = quill;
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const quill = quillRef.current;
    if (quill.root.innerHTML !== value) {
      quill.root.innerHTML = DOMPurify.sanitize(value || '');
    }
  }, [value]);

  return <div ref={containerRef} style={{ minHeight: '400px' }} />;
}
```

- [ ] **Step 2: TagInput 컴포넌트 작성**

```jsx
// frontend/src/components/TagInput.jsx
import { useEffect, useState } from 'react';
import { getTags, createTag } from '../api/tags';
import { addTag, removeTag } from '../api/pages';

export default function TagInput({ pageId, pageTags, onTagsChange }) {
  const [allTags, setAllTags] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    getTags().then((res) => setAllTags(res.data.data));
  }, []);

  const handleAdd = async (tag) => {
    if (pageTags.find((t) => t.id === tag.id)) return;
    const res = await addTag(pageId, tag.id);
    onTagsChange(res.data.data.tags);
  };

  const handleRemove = async (tagId) => {
    const res = await removeTag(pageId, tagId);
    onTagsChange(res.data.data.tags);
  };

  const handleCreate = async (e) => {
    if (e.key === 'Enter' && input.trim()) {
      const res = await createTag(input.trim());
      const newTag = res.data.data;
      setAllTags([...allTags, newTag]);
      await handleAdd(newTag);
      setInput('');
    }
  };

  const suggestions = allTags.filter(
    (t) => t.name.includes(input) && !pageTags.find((pt) => pt.id === t.id)
  );

  return (
    <div style={styles.container}>
      <div style={styles.chips}>
        {pageTags.map((tag) => (
          <span key={tag.id} style={styles.chip}>
            {tag.name}
            <button style={styles.chipRemove} onClick={() => handleRemove(tag.id)}>×</button>
          </span>
        ))}
        <input
          style={styles.input}
          placeholder="태그 추가..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCreate}
        />
      </div>
      {input && suggestions.length > 0 && (
        <div style={styles.dropdown}>
          {suggestions.map((tag) => (
            <div key={tag.id} style={styles.dropdownItem} onClick={() => { handleAdd(tag); setInput(''); }}>
              {tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { position: 'relative', marginBottom: '16px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  chip: { background: '#e8e5de', padding: '2px 8px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' },
  chipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, lineHeight: 1 },
  input: { border: 'none', outline: 'none', fontSize: '13px', minWidth: '80px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ddd', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 100 },
  dropdownItem: { padding: '8px 12px', cursor: 'pointer', fontSize: '13px' },
};
```

- [ ] **Step 3: PageDetailPage 작성 (자동저장 포함)**

```jsx
// frontend/src/pages/PageDetailPage.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getPage, updatePage, deletePage } from '../api/pages';
import { usePageContext } from '../context/PageContext';
import Editor from '../components/Editor';
import TagInput from '../components/TagInput';

const EMOJIS = ['📄', '📝', '📋', '💡', '🎯', '✅', '📊', '🗂️', '🏷️', '🔍'];

export default function PageDetailPage() {
  const { id } = useParams();
  const [page, setPage] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [emoji, setEmoji] = useState('📄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { refreshTree } = usePageContext();
  const saveTimer = useRef(null);

  useEffect(() => {
    getPage(id).then((res) => {
      const p = res.data.data;
      setPage(p);
      setTitle(p.title);
      setContent(p.content || '');
      setTags(p.tags || []);
      setEmoji(p.emoji || '📄');
    });
  }, [id]);

  const save = useCallback(async (newTitle, newContent, newEmoji) => {
    await updatePage(id, { title: newTitle, content: newContent, emoji: newEmoji });
    await refreshTree();
  }, [id, refreshTree]);

  const scheduleAutoSave = (newTitle, newContent, newEmoji) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(newTitle, newContent, newEmoji), 1500);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    scheduleAutoSave(e.target.value, content, emoji);
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    scheduleAutoSave(title, newContent, emoji);
  };

  const handleEmojiSelect = (e) => {
    setEmoji(e);
    setShowEmojiPicker(false);
    save(title, content, e);
  };

  if (!page) return <div style={{ padding: '40px', color: '#aaa' }}>로딩 중...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ position: 'relative' }}>
          <span
            style={styles.emoji}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="이모지 변경"
          >
            {emoji}
          </span>
          {showEmojiPicker && (
            <div style={styles.emojiPicker}>
              {EMOJIS.map((e) => (
                <span key={e} style={styles.emojiOption} onClick={() => handleEmojiSelect(e)}>{e}</span>
              ))}
            </div>
          )}
        </div>
        <input
          style={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder="제목 없음"
        />
      </div>
      <TagInput pageId={Number(id)} pageTags={tags} onTagsChange={setTags} />
      <Editor value={content} onChange={handleContentChange} />
      <div style={styles.meta}>
        마지막 수정: {page.updatedAt ? new Date(page.updatedAt).toLocaleString('ko-KR') : '-'}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px 60px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  emoji: { fontSize: '32px', cursor: 'pointer', userSelect: 'none' },
  titleInput: { flex: 1, border: 'none', outline: 'none', fontSize: '28px', fontWeight: '700', color: '#1a1a1a', background: 'transparent' },
  emojiPicker: { position: 'absolute', top: '40px', left: 0, background: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  emojiOption: { fontSize: '24px', cursor: 'pointer', padding: '4px', borderRadius: '4px' },
  meta: { marginTop: '24px', fontSize: '12px', color: '#aaa' },
};
```

- [ ] **Step 4: 프론트엔드 개발 서버 기동 확인**

```bash
cd frontend && npm run dev
```

Expected: `http://localhost:3000` 정상 기동

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/
git commit -m "feat: page editor with Quill rich text, auto-save, tag input, and emoji picker"
```

---

## Task 9: 전체 통합 검증 및 마무리

- [ ] **Step 1: 백엔드 전체 테스트 실행**

```bash
cd backend && mvn test
```

Expected: 전체 PASS, BUILD SUCCESS

- [ ] **Step 2: Docker MySQL + 백엔드 + 프론트 동시 기동**

터미널 3개 필요:

```bash
# 터미널 1 — DB
docker-compose up mysql

# 터미널 2 — 백엔드
cd backend && mvn spring-boot:run

# 터미널 3 — 프론트
cd frontend && npm run dev
```

- [ ] **Step 3: 전체 플로우 수동 검증**

1. `http://localhost:3000/register` 접속 → 회원가입
2. `/login` → 로그인 → 워크스페이스 진입 확인
3. "새 페이지" 클릭 → 페이지 생성 확인
4. 사이드바에 새 페이지 노출 확인
5. 페이지 클릭 → 에디터 진입
6. 제목/내용 수정 → 1.5초 후 자동저장 확인 (새로고침해도 유지)
7. 태그 추가/제거 동작 확인
8. 이모지 변경 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add .
git commit -m "chore: complete meeting notes app (Spring Boot + React + MySQL)"
```

---

## 자체 검토 (Spec Coverage)

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| Spring Boot 백엔드 | Task 1, 2, 3, 4, 5 |
| React 프론트엔드 | Task 1, 6, 7, 8 |
| MySQL + Docker | Task 1 |
| JWT 인증 | Task 3 |
| 계층형 페이지 | Task 4 (Page.parent + PageTreeResponse) |
| Rich Text 에디터 | Task 8 (Quill.js) |
| 태그 | Task 5 (Tag 엔티티 + API), Task 8 (TagInput) |
| 전문 검색 | Task 4 (PageRepository.searchByKeyword) |
| 자동저장 | Task 8 (debounce 1500ms) |
| 이모지 | Task 8 (이모지 피커) |
| CORS | Task 3 (CorsConfig) |
| XSS 방어 | Task 8 (DOMPurify) |
| GlobalExceptionHandler | Task 2 |
| 토큰 갱신 | Task 6 (axios.js 인터셉터) |
