import { Routes, Route } from 'react-router-dom';
import { PageProvider } from '../context/PageContext';
import Sidebar from '../components/Sidebar';
import PageDetailPage from './PageDetailPage';
import { useTheme } from '../context/ThemeContext';

export default function WorkspacePage() {
  // 현재 테마 색상 주입
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <PageProvider>
      <div style={styles.layout}>
        <Sidebar />
        <div style={styles.content}>
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
  // EmptyState도 테마 적용
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <div style={styles.emptyState}>
      <span style={{ fontSize: '48px' }}>📋</span>
      <p>왼쪽 사이드바에서 페이지를 선택하거나 새 페이지를 만드세요.</p>
    </div>
  );
}

// 색상 토큰을 받아 스타일 객체 생성
const makeStyles = (c) => ({
  layout: { display: 'flex', height: '100vh', background: c.bg },
  content: { flex: 1, overflow: 'auto', background: c.bg },
  // 빈 상태 안내 텍스트: muted 색상 사용
  emptyState: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: c.textMuted, flexDirection: 'column', gap: '8px' },
});
