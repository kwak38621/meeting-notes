import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePageContext } from '../context/PageContext';
import { createPage } from '../api/pages';
import PageTreeNode from './PageTreeNode';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pageTree, refreshTree } = usePageContext();
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

const styles = {
  sidebar: { width: '240px', height: '100vh', background: '#f7f6f3', borderRight: '1px solid #e8e5de', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  header: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e8e5de' },
  logo: { fontSize: '20px' },
  userName: { fontSize: '14px', fontWeight: '600', color: '#1a1a1a' },
  search: { margin: '8px', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', outline: 'none' },
  tree: { flex: 1, overflowY: 'auto', padding: '4px' },
  footer: { padding: '12px', borderTop: '1px solid #e8e5de', display: 'flex', flexDirection: 'column', gap: '8px' },
  newPageBtn: { padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  logoutBtn: { padding: '8px', background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
};
