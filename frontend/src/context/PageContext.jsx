import { createContext, useContext, useState, useCallback } from 'react';
import { getPageTree, getFavorites } from '../api/pages';

const PageContext = createContext(null);

export function PageProvider({ children }) {
  const [pageTree, setPageTree] = useState([]);
  // 즐겨찾기 페이지 목록 (사이드바 상단 섹션에서 사용)
  const [favorites, setFavorites] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);

  const refreshTree = useCallback(async () => {
    const res = await getPageTree();
    setPageTree(res.data.data);
  }, []);

  // 즐겨찾기 목록 재조회 — 토글 후 호출 필요
  const refreshFavorites = useCallback(async () => {
    const res = await getFavorites();
    setFavorites(res.data.data);
  }, []);

  return (
    <PageContext.Provider
      value={{ pageTree, refreshTree, favorites, refreshFavorites, selectedPageId, setSelectedPageId }}
    >
      {children}
    </PageContext.Provider>
  );
}

export const usePageContext = () => useContext(PageContext);
