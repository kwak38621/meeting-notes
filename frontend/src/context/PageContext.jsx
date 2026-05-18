import { createContext, useContext, useState, useCallback } from 'react';
import { getPageTree } from '../api/pages';

const PageContext = createContext(null);

export function PageProvider({ children }) {
  const [pageTree, setPageTree] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);

  const refreshTree = useCallback(async () => {
    const res = await getPageTree();
    setPageTree(res.data.data);
  }, []);

  return (
    <PageContext.Provider value={{ pageTree, refreshTree, selectedPageId, setSelectedPageId }}>
      {children}
    </PageContext.Provider>
  );
}

export const usePageContext = () => useContext(PageContext);
