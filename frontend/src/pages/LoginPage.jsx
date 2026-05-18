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
