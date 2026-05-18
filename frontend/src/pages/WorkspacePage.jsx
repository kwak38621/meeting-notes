import { Routes, Route } from 'react-router-dom';
import { PageProvider } from '../context/PageContext';
import Sidebar from '../components/Sidebar';
import PageDetailPage from './PageDetailPage';

export default function WorkspacePage() {
  return (
    <PageProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<EmptyState />} />
            <Route path="/pages/:id" element={<PageDetailPage />} />
          </Routes>
        </div>
      </div>
    </PageProvider>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '48px' }}>📋</span>
      <p>왼쪽 사이드바에서 페이지를 선택하거나 새 페이지를 만드세요.</p>
    </div>
  );
}
