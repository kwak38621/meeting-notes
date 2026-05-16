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
