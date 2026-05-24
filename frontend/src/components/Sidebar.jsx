import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageContext } from '../context/PageContext';
import { useTheme } from '../context/ThemeContext';
import { createPage, searchPages, getPagesByTag } from '../api/pages';
import { getTags } from '../api/tags';
import PageTreeNode from './PageTreeNode';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pageTree, refreshTree, favorites, refreshFavorites } = usePageContext();
  const navigate = useNavigate();
  const { mode, toggle, colors } = useTheme();
  const styles = makeStyles(colors);
  const [search, setSearch] = useState('');
  // 백엔드 검색 결과 (제목+본문 매칭, 평탄 리스트)
  const [searchResults, setSearchResults] = useState([]);
  // 태그 목록 + 선택된 태그(필터 모달용)
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [tagPages, setTagPages] = useState([]);

  useEffect(() => {
    refreshTree();
    refreshFavorites();
    getTags().then((res) => setTags(res.data.data || [])).catch(() => {});
  }, [refreshTree, refreshFavorites]);

  // 태그 클릭 시 해당 태그를 가진 페이지 조회
  const handleTagClick = async (tag) => {
    try {
      const res = await getPagesByTag(tag.id);
      setTagPages(res.data.data || []);
      setActiveTag(tag);
    } catch {
      setTagPages([]);
      setActiveTag(tag);
    }
  };

  // 검색어 디바운스 — 300ms 후 백엔드 호출 (제목 + 본문 검색)
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      searchPages(q).then((res) => setSearchResults(res.data.data || [])).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleNewPage = async () => {
    // 새 페이지 생성 후 해당 페이지로 자동 이동
    const res = await createPage({ title: '새 페이지', content: '', emoji: '📄' });
    await refreshTree();
    navigate(`/pages/${res.data.data.id}`);
  };

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
      {favorites.length > 0 && (
        <div style={styles.favSection}>
          <div style={styles.favHeader}>⭐ 즐겨찾기 ({favorites.length})</div>
          {favorites.map((p) => (
            <div key={p.id} style={styles.favItem} onClick={() => navigate(`/pages/${p.id}`)}>
              <span>{p.emoji || '📄'}</span>
              <span>{p.title}</span>
            </div>
          ))}
        </div>
      )}
      <div style={styles.tree}>
        {search.trim() ? (
          // 검색 모드: 백엔드 결과를 평탄 리스트로 표시 (제목+본문 매칭)
          searchResults.length > 0 ? (
            searchResults.map((p) => (
              <div key={p.id} style={styles.searchItem} onClick={() => navigate(`/pages/${p.id}`)}>
                <span>{p.emoji || '📄'}</span>
                <span style={styles.searchTitle}>{p.title}</span>
              </div>
            ))
          ) : (
            <div style={styles.empty}>검색 결과 없음</div>
          )
        ) : (
          pageTree.map((node) => <PageTreeNode key={node.id} node={node} />)
        )}
      </div>
      {tags.length > 0 && (
        <div style={styles.tagSection}>
          <div style={styles.tagHeader}>🏷️ 태그</div>
          <div style={styles.tagList}>
            {tags.map((t) => (
              <span key={t.id} style={styles.tagChip} onClick={() => handleTagClick(t)}>
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={styles.footer}>
        <button style={styles.newPageBtn} onClick={handleNewPage}>+ 새 페이지</button>
        <button style={styles.logoutBtn} onClick={logout}>로그아웃</button>
      </div>
      {activeTag && (
        <div style={styles.overlay} onMouseDown={() => setActiveTag(null)}>
          <div style={styles.tagModal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.tagModalHeader}>🏷️ {activeTag.name} ({tagPages.length})</div>
            <div style={styles.tagModalList}>
              {tagPages.length === 0 ? (
                <div style={styles.empty}>해당 태그를 가진 페이지가 없습니다.</div>
              ) : (
                tagPages.map((p) => (
                  <div
                    key={p.id}
                    style={styles.searchItem}
                    onClick={() => { setActiveTag(null); navigate(`/pages/${p.id}`); }}
                  >
                    <span>{p.emoji || '📄'}</span>
                    <span style={styles.searchTitle}>{p.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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
  favSection: { padding: '4px 0', borderBottom: `1px solid ${c.border}` },
  favHeader: { padding: '6px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', color: c.textMuted },
  favItem: { padding: '6px 16px', fontSize: '13px', color: c.text, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
  searchItem: { padding: '6px 12px', fontSize: '13px', color: c.text, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
  searchTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { padding: '12px 16px', fontSize: '12px', color: c.textMuted },
  tagSection: { padding: '8px 0', borderTop: `1px solid ${c.border}` },
  tagHeader: { padding: '6px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', color: c.textMuted },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 12px 8px' },
  tagChip: { padding: '2px 8px', background: c.inputBg, border: `1px solid ${c.border}`, borderRadius: '10px', fontSize: '11px', color: c.text, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: c.modalOverlay, zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '15vh' },
  tagModal: { width: 'min(480px, 90vw)', background: c.sidebarBg, border: `1px solid ${c.border}`, borderRadius: '8px', boxShadow: c.shadow, overflow: 'hidden', height: 'fit-content', display: 'flex', flexDirection: 'column' },
  tagModalHeader: { padding: '12px 16px', borderBottom: `1px solid ${c.border}`, color: c.text, fontSize: '13px', fontWeight: 600 },
  tagModalList: { maxHeight: '50vh', overflow: 'auto', padding: '6px 0' },
});
