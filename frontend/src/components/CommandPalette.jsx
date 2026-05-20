// Ctrl+K로 열리는 커맨드 팔레트. 빈 query면 최근 페이지, 입력 시 페이지+액션 매칭.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePageContext } from '../context/PageContext';
import { useHotkey } from '../hooks/useHotkey';
import { useRecentPages } from '../hooks/useRecentPages';
import { createPage } from '../api/pages';

// 트리(중첩 children)를 평탄화해 id -> {id,title,emoji} 맵으로 만든다.
function flattenTree(tree, out = new Map()) {
  for (const n of tree || []) {
    out.set(n.id, { id: n.id, title: n.title, emoji: n.emoji });
    if (n.children?.length) flattenTree(n.children, out);
  }
  return out;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const { colors, toggle: toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { pageTree, refreshTree } = usePageContext();
  const { ids: recentIds } = useRecentPages();
  const navigate = useNavigate();

  const styles = makeStyles(colors);
  const pageMap = useMemo(() => flattenTree(pageTree), [pageTree]);

  // Ctrl+K로 열기
  useHotkey('mod+k', () => { setOpen(true); setQuery(''); setCursor(0); }, []);

  // 열릴 때 input 포커스
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // 액션 레지스트리
  const actions = useMemo(() => ([
    { id: 'new-page', label: '새 페이지 만들기', icon: '➕', run: async () => {
      const res = await createPage({ title: '새 페이지', content: '', emoji: '📄' });
      await refreshTree();
      navigate(`/pages/${res.data.data.id}`);
    }},
    { id: 'toggle-dark', label: '다크모드 토글', icon: '🌙', run: () => toggleTheme() },
    { id: 'logout', label: '로그아웃', icon: '🚪', run: () => logout() },
  ]), [refreshTree, navigate, toggleTheme, logout]);

  // 매칭 계산
  const { items, sections } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recent = recentIds
        .map((id) => pageMap.get(id))
        .filter(Boolean)
        .slice(0, 5)
        .map((p) => ({ kind: 'page', ...p }));
      return { items: recent, sections: [{ label: '최근 본 페이지', start: 0, end: recent.length }] };
    }
    const pages = [...pageMap.values()]
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ kind: 'page', ...p }));
    const acts = actions
      .filter((a) => a.label.toLowerCase().includes(q))
      .map((a) => ({ kind: 'action', ...a }));
    const flat = [...pages, ...acts];
    const sections = [];
    if (pages.length) sections.push({ label: '페이지', start: 0, end: pages.length });
    if (acts.length) sections.push({ label: '액션', start: pages.length, end: pages.length + acts.length });
    return { items: flat, sections };
  }, [query, pageMap, recentIds, actions]);

  // cursor 범위 보정
  useEffect(() => { if (cursor >= items.length) setCursor(0); }, [items.length, cursor]);

  const runItem = (item) => {
    setOpen(false);
    if (item.kind === 'page') navigate(`/pages/${item.id}`);
    else item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(items.length - 1, c + 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (items[cursor]) runItem(items[cursor]); }
  };

  if (!open) return null;

  return (
    <div style={styles.overlay} onMouseDown={() => setOpen(false)}>
      <div style={styles.box} onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="페이지 검색 또는 명령 실행..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={onKeyDown}
        />
        <div style={styles.list}>
          {sections.map((sec) => (
            <div key={sec.label}>
              <div style={styles.sectionLabel}>{sec.label}</div>
              {items.slice(sec.start, sec.end).map((it, idx) => {
                const realIdx = sec.start + idx;
                const active = realIdx === cursor;
                return (
                  <div
                    key={`${it.kind}-${it.id}`}
                    style={{ ...styles.row, background: active ? colors.selectedBg : 'transparent' }}
                    onMouseEnter={() => setCursor(realIdx)}
                    onClick={() => runItem(it)}
                  >
                    <span>{it.kind === 'page' ? (it.emoji || '📄') : it.icon}</span>
                    <span>{it.kind === 'page' ? it.title : it.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div style={styles.empty}>일치하는 결과가 없습니다.</div>
          )}
        </div>
        <div style={styles.footer}>
          <span>↑↓ 이동</span><span>↵ 선택</span><span>esc 닫기</span>
        </div>
      </div>
    </div>
  );
}

const makeStyles = (c) => ({
  overlay: { position: 'fixed', inset: 0, background: c.modalOverlay, zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '15vh' },
  box: { width: 'min(560px, 90vw)', background: c.sidebarBg, border: `1px solid ${c.border}`, borderRadius: '8px', boxShadow: c.shadow, overflow: 'hidden', height: 'fit-content' },
  input: { width: '100%', padding: '14px 18px', border: 0, borderBottom: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  list: { maxHeight: '50vh', overflow: 'auto', padding: '6px 0' },
  sectionLabel: { padding: '6px 18px 2px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.05em', color: c.textMuted },
  row: { padding: '8px 18px', color: c.text, display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' },
  empty: { padding: '16px 18px', color: c.textMuted, fontSize: '13px' },
  footer: { padding: '8px 18px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: '14px', fontSize: '11px', color: c.textMuted, background: c.bg },
});
