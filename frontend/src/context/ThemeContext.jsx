// 테마 모드(light/dark)와 토글, 현재 colors를 전역 공급. localStorage에 모드 영속화.
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { themes } from '../styles/theme';
import { QUILL_DARK_CSS } from '../styles/quill-dark';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'theme';

export function ThemeProvider({ children }) {
  // 초기값: localStorage에 'dark'면 dark, 그 외(없거나 잘못된 값)는 light
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // 모드 변경 시 localStorage 동기화
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  // dark 모드일 때만 Quill 오버라이드 CSS를 document.head에 주입
  useEffect(() => {
    const id = 'quill-dark-overrides';
    const existing = document.getElementById(id);
    if (mode === 'dark') {
      if (!existing) {
        const el = document.createElement('style');
        el.id = id;
        el.textContent = QUILL_DARK_CSS;
        document.head.appendChild(el);
      }
    } else if (existing) {
      existing.remove();
    }
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : 'light'));
  }, []);

  const colors = themes[mode];

  const value = useMemo(() => ({ mode, toggle, colors }), [mode, toggle, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
