// 빈 페이지에 표시되는 템플릿 시작 띠. 클릭 시 드롭다운으로 6개 템플릿 노출.
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { TEMPLATES } from '../templates';

export default function TemplatePicker({ onPick }) {
  const { colors } = useTheme();
  const [openMenu, setOpenMenu] = useState(false);
  const styles = makeStyles(colors);

  return (
    <div style={styles.banner}>
      <span>💡 빈 페이지예요. 템플릿에서 시작하시겠어요?</span>
      <div style={{ position: 'relative' }}>
        <button style={styles.btn} onClick={() => setOpenMenu((v) => !v)}>
          ▾ 템플릿
        </button>
        {openMenu && (
          <div style={styles.menu}>
            {TEMPLATES.map((t) => (
              <div
                key={t.id}
                style={styles.item}
                onClick={() => { setOpenMenu(false); onPick(t); }}
              >
                <span>{t.emoji}</span><span>{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 테마 색상 토큰으로 배너·버튼·드롭다운 스타일 생성
const makeStyles = (c) => ({
  banner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', margin: '12px 0', border: `1px dashed ${c.border}`, borderRadius: '6px', background: c.sidebarBg, color: c.textMuted, fontSize: '13px' },
  btn: { padding: '6px 10px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  menu: { position: 'absolute', top: '110%', right: 0, minWidth: '200px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '6px', boxShadow: c.shadow, padding: '4px 0', zIndex: 10 },
  item: { padding: '8px 14px', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', color: c.text, fontSize: '13px' },
});
