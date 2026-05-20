import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePageContext } from '../context/PageContext';
import { useTheme } from '../context/ThemeContext';
import { createPage } from '../api/pages';
import PageTreeNode from './PageTreeNode';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pageTree, refreshTree } = usePageContext();
  const { mode, toggle, colors } = useTheme();
  const styles = makeStyles(colors);
  const [search, setSearch] = useState('');

  useEffect(() => { refreshTree(); }, [refreshTree]);

  const handleNewPage = async () => {
    await createPage({ title: '새 페이지', content: '', emoji: '📄' });
    await refreshTree();
  };

  const filtered = search
    ? pageTree.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : pageTree;

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.logo}>📋</span>
        <span style={styles.userName}>{user?.name}</span>
        <button style={styles.themeBtn} onClick={toggle} title="테마 전환">
          {mode === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
      <input
        style={styles.search}
        placeholder="페이지 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={styles.tree}>
        {filtered.map((node) => (
          <PageTreeNode key={node.id} node={node} />
        ))}
      </div>
      <div style={styles.footer}>
        <button style={styles.newPageBtn} onClick={handleNewPage}>+ 새 페이지</button>
        <button style={styles.logoutBtn} onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}

const makeStyles = (c) => ({
  sidebar: { width: '240px', height: '100vh', background: c.sidebarBg, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 },
  header: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${c.border}` },
  logo: { fontSize: '20px' },
  userName: { fontSize: '14px', fontWeight: '600', color: c.text, flex: 1 },
  themeBtn: { background: 'transparent', border: 0, cursor: 'pointer', fontSize: '16px', padding: '4px' },
  search: { margin: '8px', padding: '6px 10px', border: `1px solid ${c.border}`, borderRadius: '4px', fontSize: '13px', outline: 'none', background: c.inputBg, color: c.text },
  tree: { flex: 1, overflowY: 'auto', padding: '4px' },
  footer: { padding: '12px', borderTop: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '8px' },
  newPageBtn: { padding: '8px', background: c.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  logoutBtn: { padding: '8px', background: 'transparent', color: c.textMuted, border: `1px solid ${c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
});
