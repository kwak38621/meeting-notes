// 전역 키보드 단축키 바인딩. combo 예: 'mod+k', 'esc'.
// 'mod'는 Mac이면 metaKey, 그 외 ctrlKey.
import { useEffect } from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function matches(combo, e) {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const modKey = isMac ? e.metaKey : e.ctrlKey;
  const needMod = parts.includes('mod');
  const needShift = parts.includes('shift');
  if (needMod !== modKey) return false;
  if (needShift !== e.shiftKey) return false;
  if (key === 'esc') return e.key === 'Escape';
  return e.key.toLowerCase() === key;
}

export function useHotkey(combo, handler, deps = []) {
  useEffect(() => {
    const fn = (e) => {
      if (matches(combo, e)) {
        e.preventDefault();
        handler(e);
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
