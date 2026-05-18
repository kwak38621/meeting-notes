import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContext } from '../context/PageContext';

export default function PageTreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const { selectedPageId, setSelectedPageId } = usePageContext();
  const navigate = useNavigate();
  const isSelected = selectedPageId === node.id;
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
          background: isSelected ? '#e8e5de' : 'transparent',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#1a1a1a',
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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title}
        </span>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <PageTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
