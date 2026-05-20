// frontend/src/pages/PageDetailPage.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getPage, updatePage, deletePage } from '../api/pages';
import { usePageContext } from '../context/PageContext';
import Editor from '../components/Editor';
import TagInput from '../components/TagInput';
import { useTheme } from '../context/ThemeContext';

const EMOJIS = ['📄', '📝', '📋', '💡', '🎯', '✅', '📊', '🗂️', '🏷️', '🔍'];

export default function PageDetailPage() {
  const { id } = useParams();
  const [page, setPage] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [emoji, setEmoji] = useState('📄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { refreshTree } = usePageContext();
  const saveTimer = useRef(null);
  // 현재 테마 색상 주입
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  useEffect(() => {
    getPage(id).then((res) => {
      const p = res.data.data;
      setPage(p);
      setTitle(p.title);
      setContent(p.content || '');
      setTags(p.tags || []);
      setEmoji(p.emoji || '📄');
    });
  }, [id]);

  const save = useCallback(async (newTitle, newContent, newEmoji) => {
    await updatePage(id, { title: newTitle, content: newContent, emoji: newEmoji });
    await refreshTree();
  }, [id, refreshTree]);

  const scheduleAutoSave = (newTitle, newContent, newEmoji) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(newTitle, newContent, newEmoji), 1500);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    scheduleAutoSave(e.target.value, content, emoji);
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    scheduleAutoSave(title, newContent, emoji);
  };

  const handleEmojiSelect = (e) => {
    setEmoji(e);
    setShowEmojiPicker(false);
    save(title, content, e);
  };

  // 로딩 중 텍스트에도 muted 색상 적용
  if (!page) return <div style={{ padding: '40px', color: colors.textMuted }}>로딩 중...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ position: 'relative' }}>
          <span
            style={styles.emoji}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="이모지 변경"
          >
            {emoji}
          </span>
          {showEmojiPicker && (
            <div style={styles.emojiPicker}>
              {EMOJIS.map((e) => (
                <span key={e} style={styles.emojiOption} onClick={() => handleEmojiSelect(e)}>{e}</span>
              ))}
            </div>
          )}
        </div>
        <input
          style={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder="제목 없음"
        />
      </div>
      <TagInput pageId={Number(id)} pageTags={tags} onTagsChange={setTags} />
      <Editor value={content} onChange={handleContentChange} />
      <div style={styles.meta}>
        마지막 수정: {page.updatedAt ? new Date(page.updatedAt).toLocaleString('ko-KR') : '-'}
      </div>
    </div>
  );
}

// 색상 토큰을 받아 스타일 객체 생성
const makeStyles = (c) => ({
  container: { padding: '40px 60px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  emoji: { fontSize: '32px', cursor: 'pointer', userSelect: 'none' },
  // 제목 입력: 텍스트 기본색, 배경 투명(부모 배경 그대로)
  titleInput: { flex: 1, border: 'none', outline: 'none', fontSize: '28px', fontWeight: '700', color: c.text, background: 'transparent' },
  // 이모지 선택 팝업: 기본 배경 + border 색상
  emojiPicker: { position: 'absolute', top: '40px', left: 0, background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  emojiOption: { fontSize: '24px', cursor: 'pointer', padding: '4px', borderRadius: '4px' },
  // 메타 정보: muted 색상 사용
  meta: { marginTop: '24px', fontSize: '12px', color: c.textMuted },
});
