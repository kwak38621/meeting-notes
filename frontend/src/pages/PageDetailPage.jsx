// frontend/src/pages/PageDetailPage.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPage, updatePage, deletePage } from '../api/pages';
import { usePageContext } from '../context/PageContext';
import Editor from '../components/Editor';
import TagInput from '../components/TagInput';
import TemplatePicker from '../components/TemplatePicker';
import MoveDialog from '../components/MoveDialog';
import { useTheme } from '../context/ThemeContext';
import { useRecentPages } from '../hooks/useRecentPages';

const EMOJIS = ['📄', '📝', '📋', '💡', '🎯', '✅', '📊', '🗂️', '🏷️', '🔍'];

// 빈 본문 판정 (Quill 빈 에디터는 '<p><br></p>'로 표현됨)
const isEmptyContent = (c) => !c || c === '<p><br></p>' || c.replace(/<[^>]*>/g, '').trim() === '';

// 저장 상태 표시
const SAVE_IDLE = 'idle', SAVE_PENDING = 'pending', SAVE_SAVING = 'saving', SAVE_DONE = 'done', SAVE_ERROR = 'error';

export default function PageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [emoji, setEmoji] = useState('📄');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [saveState, setSaveState] = useState(SAVE_IDLE);
  const { refreshTree } = usePageContext();
  // 자동저장 타이머와 페이지 id를 묶어 추적 (race 방지)
  const saveTimer = useRef(null);
  const pendingPayload = useRef(null);
  const currentIdRef = useRef(id);
  const { push: pushRecent } = useRecentPages();
  // 현재 테마 색상 주입
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // id 변경 시 currentIdRef 동기화
  useEffect(() => { currentIdRef.current = id; }, [id]);

  // 페이지 방문 시 최근 목록에 등록
  useEffect(() => {
    if (id) pushRecent(Number(id));
  }, [id, pushRecent]);

  // id 변경/언마운트 시 대기중인 저장 즉시 flush — 이전 페이지 내용이 새 페이지로 저장되는 race 방지
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const payload = pendingPayload.current;
        if (payload) {
          // 정리 시점에 즉시 저장 (await 없이 fire-and-forget)
          updatePage(payload.id, { title: payload.title, content: payload.content, emoji: payload.emoji })
            .catch(() => {});
          pendingPayload.current = null;
        }
      }
    };
  }, [id]);

  useEffect(() => {
    getPage(id).then((res) => {
      const p = res.data.data;
      setPage(p);
      setTitle(p.title);
      setContent(p.content || '');
      setTags(p.tags || []);
      setEmoji(p.emoji || '📄');
      setSaveState(SAVE_IDLE);
    });
  }, [id]);

  const save = useCallback(async (targetId, newTitle, newContent, newEmoji) => {
    try {
      setSaveState(SAVE_SAVING);
      await updatePage(targetId, { title: newTitle, content: newContent, emoji: newEmoji });
      // 저장 후에도 동일 페이지에 머물러 있을 때만 상태 갱신
      if (currentIdRef.current === String(targetId) || currentIdRef.current === targetId) {
        setSaveState(SAVE_DONE);
      }
      await refreshTree();
    } catch {
      if (currentIdRef.current === String(targetId) || currentIdRef.current === targetId) {
        setSaveState(SAVE_ERROR);
      }
    }
  }, [refreshTree]);

  const scheduleAutoSave = (newTitle, newContent, newEmoji) => {
    clearTimeout(saveTimer.current);
    // 현재 페이지 id를 캡처해서 1.5s 뒤에도 그 id로 저장 (race 안전)
    const capturedId = id;
    pendingPayload.current = { id: capturedId, title: newTitle, content: newContent, emoji: newEmoji };
    setSaveState(SAVE_PENDING);
    saveTimer.current = setTimeout(() => {
      pendingPayload.current = null;
      save(capturedId, newTitle, newContent, newEmoji);
    }, 1500);
  };

  // 삭제 — confirm 후 호출, 트리 갱신 후 홈으로
  const handleDelete = async () => {
    if (!window.confirm(`"${title || '제목 없음'}" 페이지를 삭제하시겠습니까?`)) return;
    // 자동저장 타이머 취소 (삭제 직후 저장 호출 방지)
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingPayload.current = null;
    try {
      await deletePage(id);
      await refreshTree();
      navigate('/');
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  // 이동 완료 콜백
  const handleMoved = async () => {
    setShowMoveDialog(false);
    await refreshTree();
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
    save(id, title, content, e);
  };

  // 템플릿 선택 시 content와 emoji를 교체하고 자동 저장 예약
  const handlePickTemplate = (tpl) => {
    setContent(tpl.content);
    if (!emoji || emoji === '📄') setEmoji(tpl.emoji);
    scheduleAutoSave(title, tpl.content, (!emoji || emoji === '📄') ? tpl.emoji : emoji);
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
        {/* 저장 상태 표시 */}
        <span style={styles.saveIndicator}>{renderSaveLabel(saveState)}</span>
        {/* 이동 / 삭제 액션 */}
        <button style={styles.actionBtn} onClick={() => setShowMoveDialog(true)} title="페이지 이동">↗</button>
        <button style={styles.actionBtn} onClick={handleDelete} title="페이지 삭제">🗑️</button>
      </div>
      <TagInput pageId={Number(id)} pageTags={tags} onTagsChange={setTags} />
      {/* 본문이 비어 있을 때만 템플릿 선택 띠 표시 */}
      {isEmptyContent(content) && <TemplatePicker onPick={handlePickTemplate} />}
      <Editor value={content} onChange={handleContentChange} />
      <div style={styles.meta}>
        마지막 수정: {page.updatedAt ? new Date(page.updatedAt).toLocaleString('ko-KR') : '-'}
      </div>
      {showMoveDialog && (
        <MoveDialog pageId={Number(id)} onClose={() => setShowMoveDialog(false)} onMoved={handleMoved} />
      )}
    </div>
  );
}

// 저장 상태 레이블
function renderSaveLabel(state) {
  switch (state) {
    case SAVE_PENDING: return '편집 중...';
    case SAVE_SAVING: return '저장 중...';
    case SAVE_DONE: return '저장됨';
    case SAVE_ERROR: return '저장 실패';
    default: return '';
  }
}

// 색상 토큰을 받아 스타일 객체 생성
const makeStyles = (c) => ({
  // 본문 최대 폭 760px + 가운데 정렬 + 넉넉한 세로 패딩으로 가독성 향상
  container: { padding: '48px 32px', maxWidth: '760px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  emoji: { fontSize: '32px', cursor: 'pointer', userSelect: 'none' },
  // 제목 입력: 텍스트 기본색, 배경 투명, 크기 36px — Notion 스타일 큰 타이틀
  titleInput: { flex: 1, border: 'none', outline: 'none', fontSize: '36px', fontWeight: '700', color: c.text, background: 'transparent' },
  // 이모지 선택 팝업: 기본 배경 + border 색상
  emojiPicker: { position: 'absolute', top: '40px', left: 0, background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  emojiOption: { fontSize: '24px', cursor: 'pointer', padding: '4px', borderRadius: '4px' },
  // 메타 정보: muted 색상 사용
  meta: { marginTop: '24px', fontSize: '12px', color: c.textMuted },
  saveIndicator: { fontSize: '12px', color: c.textMuted, minWidth: '60px', textAlign: 'right' },
  actionBtn: { background: 'transparent', border: `1px solid ${c.border}`, color: c.text, borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px' },
});
