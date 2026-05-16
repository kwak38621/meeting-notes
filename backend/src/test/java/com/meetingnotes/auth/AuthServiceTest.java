package com.meetingnotes.auth;

import com.meetingnotes.auth.dto.LoginRequest;
import com.meetingnotes.auth.dto.RegisterRequest;
import com.meetingnotes.auth.dto.AuthResponse;
import com.meetingnotes.user.User;
import com.meetingnotes.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock JwtUtil jwtUtil;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks AuthService authService;

    @Test
    void register_성공() {
        RegisterRequest req = new RegisterRequest("test@test.com", "password123", "홍길동");
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
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
        String encodedPassword = "encoded-password";
        User user = User.builder()
            .email("test@test.com")
            .password(encodedPassword)
            .name("홍길동").build();

        LoginRequest req = new LoginRequest("test@test.com", "password123");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", encodedPassword)).thenReturn(true);
        when(jwtUtil.generateAccessToken("test@test.com")).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken("test@test.com")).thenReturn("refresh-token");

        AuthResponse response = authService.login(req);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void login_비밀번호_불일치_예외() {
        String encodedPassword = "encoded-password";
        User user = User.builder()
            .email("test@test.com")
            .password(encodedPassword)
            .name("홍길동").build();

        LoginRequest req = new LoginRequest("test@test.com", "wrongpassword");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", encodedPassword)).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("비밀번호");
    }

    @Test
    void refresh_성공() {
        when(jwtUtil.isValid("valid-refresh-token")).thenReturn(true);
        when(jwtUtil.extractEmail("valid-refresh-token")).thenReturn("test@test.com");
        User user = User.builder().email("test@test.com").password("encoded").name("홍길동").build();
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateAccessToken("test@test.com")).thenReturn("new-access-token");
        when(jwtUtil.generateRefreshToken("test@test.com")).thenReturn("new-refresh-token");

        AuthResponse response = authService.refresh("valid-refresh-token");
        assertThat(response.accessToken()).isEqualTo("new-access-token");
    }

    @Test
    void refresh_유효하지않은토큰_예외() {
        when(jwtUtil.isValid("bad-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh("bad-token"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("유효하지 않은");
    }
}
