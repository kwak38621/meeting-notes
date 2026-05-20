// 최근 본 페이지 id를 localStorage에 누적(최대 10개 저장). 표시는 5개.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'recentPages';
const MAX_STORE = 10;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}

export function useRecentPages() {
  const [ids, setIds] = useState(read);

  // 다른 탭에서 변경된 경우 동기화
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const push = useCallback((id) => {
    setIds((cur) => {
      const next = [id, ...cur.filter((x) => x !== id)].slice(0, MAX_STORE);
      write(next);
      return next;
    });
  }, []);

  return { ids, push };
}
