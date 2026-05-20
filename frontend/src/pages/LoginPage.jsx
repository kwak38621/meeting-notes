import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  // 현재 테마 색상 주입
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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

// 색상 토큰을 받아 스타일 객체 생성
const makeStyles = (c) => ({
  // 전체 배경: 사이드바 배경색 사용
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: c.sidebarBg },
  // 카드: 기본 배경색
  card: { background: c.bg, padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '360px' },
  // 제목: 기본 텍스트 색상
  title: { fontSize: '24px', marginBottom: '8px', color: c.text },
  subtitle: { fontSize: '18px', marginBottom: '24px', color: c.textMuted, fontWeight: 'normal' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  // 입력 필드: input 배경 + border 색상
  input: { padding: '10px 14px', border: `1px solid ${c.border}`, borderRadius: '4px', fontSize: '14px', outline: 'none', background: c.inputBg, color: c.text },
  // 제출 버튼: 액센트 색상 배경
  button: { padding: '12px', background: c.accent, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' },
  // 오류 메시지: danger 색상
  error: { color: c.danger, fontSize: '13px', marginBottom: '8px' },
  // 링크 안내 텍스트: muted 색상
  link: { textAlign: 'center', marginTop: '16px', fontSize: '13px', color: c.textMuted },
});
