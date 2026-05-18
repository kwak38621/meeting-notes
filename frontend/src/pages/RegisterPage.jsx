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
