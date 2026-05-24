import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContext } from '../context/PageContext';
import { useTheme } from '../context/ThemeContext';
import { toggleFavorite } from '../api/pages';

export default function PageTreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const { selectedPageId, setSelectedPageId, refreshTree, refreshFavorites } = usePageContext();
  const navigate = useNavigate();
  // 현재 테마 색상 주입
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isSelected = selectedPageId === node.id;

  // 즐겨찾기 토글 — 별 클릭 시 호출
  const handleToggleFav = async (e) => {
    e.stopPropagation();
    await toggleFavorite(node.id, !node.favorite);
    await refreshTree();
    await refreshFavorites();
  };
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          paddingLeft: `${16 + depth * 16}px`,
          cursor: 'pointer',
          // 선택 여부에 따라 배경색 동적 적용
          background: isSelected ? colors.selectedBg : 'transparent',
          borderRadius: '4px',
          fontSize: '14px',
          color: colors.text,
        }}
        onClick={() => {
          setSelectedPageId(node.id);
          navigate(`/pages/${node.id}`);
        }}
      >
        {hasChildren && (
          <span
            style={{ marginRight: '4px', fontSize: '10px', userSelect: 'none' }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ marginRight: '4px', width: '14px', display: 'inline-block' }} />}
        <span style={{ marginRight: '6px' }}>{node.emoji || '📄'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {node.title}
        </span>
        <button style={styles.favBtn} onClick={handleToggleFav} title={node.favorite ? '즐겨찾기 해제' : '즐겨찾기'}>
          {node.favorite ? '⭐' : '☆'}
        </button>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <PageTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// 색상 토큰을 받아 스타일 객체 생성
const makeStyles = (c) => ({
  // 현재 이 파일의 스타일은 인라인으로 직접 사용되므로 makeStyles는 예비 슬롯
  favBtn: { background: 'transparent', border: 0, cursor: 'pointer', color: c.textMuted, fontSize: '13px', padding: '0 4px' },
});
