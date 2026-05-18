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
