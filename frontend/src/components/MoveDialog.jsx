// 페이지의 부모를 변경하는 모달 — 트리를 표시하고 새 부모 선택 (루트로도 이동 가능)
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { usePageContext } from '../context/PageContext';
import { movePage } from '../api/pages';

// 트리에서 특정 id의 노드를 찾고 해당 서브트리의 모든 id를 수집 (이동 시 자기 자신/후손 제외용)
function collectSubtreeIds(tree, targetId, acc = new Set()) {
  for (const n of tree || []) {
    if (n.id === targetId) {
      gather(n, acc);
      return acc;
    }
    if (n.children?.length) collectSubtreeIds(n.children, targetId, acc);
  }
  return acc;
}
function gather(node, acc) {
  acc.add(node.id);
  for (const c of node.children || []) gather(c, acc);
}

export default function MoveDialog({ pageId, onClose, onMoved }) {
  const { colors } = useTheme();
  const { pageTree } = usePageContext();
  const [submitting, setSubmitting] = useState(false);
  const styles = makeStyles(colors);

  // 자기 자신/후손은 부모 선택지에서 제외
  const excluded = useMemo(() => collectSubtreeIds(pageTree, pageId), [pageTree, pageId]);

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePick = async (newParentId) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await movePage(pageId, newParentId);
      onMoved();
    } catch {
      alert('이동에 실패했습니다.');
      setSubmitting(false);
    }
  };

  // 노드 렌더링 — 자기 자신/후손은 비활성화
  const renderNode = (node, depth = 0) => {
    const disabled = excluded.has(node.id);
    return (
      <div key={node.id}>
        <div
          style={{
            ...styles.row,
            paddingLeft: `${12 + depth * 16}px`,
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onClick={() => !disabled && handlePick(node.id)}
        >
          <span>{node.emoji || '📄'}</span>
          <span>{node.title}</span>
        </div>
        {node.children?.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div style={styles.box} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.header}>페이지 이동 — 새 부모 선택</div>
        <div style={styles.list}>
          {/* 루트로 이동 옵션 */}
          <div style={{ ...styles.row, paddingLeft: '12px' }} onClick={() => handlePick(null)}>
            <span>🏠</span><span>(최상위)</span>
          </div>
          {pageTree.map((n) => renderNode(n, 0))}
        </div>
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

const makeStyles = (c) => ({
  overlay: { position: 'fixed', inset: 0, background: c.modalOverlay, zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '15vh' },
  box: { width: 'min(480px, 90vw)', background: c.sidebarBg, border: `1px solid ${c.border}`, borderRadius: '8px', boxShadow: c.shadow, overflow: 'hidden', height: 'fit-content', display: 'flex', flexDirection: 'column' },
  header: { padding: '12px 16px', borderBottom: `1px solid ${c.border}`, color: c.text, fontSize: '13px', fontWeight: 600 },
  list: { maxHeight: '50vh', overflow: 'auto', padding: '6px 0' },
  row: { padding: '6px 12px', color: c.text, display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' },
  footer: { padding: '8px 12px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end' },
  cancelBtn: { background: 'transparent', border: `1px solid ${c.border}`, color: c.text, borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
});
