// frontend/src/components/Editor.jsx
import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { useTheme } from '../context/ThemeContext';

export default function Editor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // 현재 테마 색상 주입 (컨테이너 배경에만 적용, Quill 내부 스타일 변환 제외)
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  useEffect(() => {
    if (quillRef.current) return;
    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: '내용을 입력하세요...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean'],
        ],
      },
    });

    quill.on('text-change', () => {
      const html = DOMPurify.sanitize(quill.root.innerHTML);
      onChangeRef.current(html);
    });

    quillRef.current = quill;
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const quill = quillRef.current;
    if (quill.root.innerHTML !== value) {
      quill.root.innerHTML = DOMPurify.sanitize(value || '');
    }
  }, [value]);

  // 에디터 컨테이너 배경만 테마 색상 적용
  return <div ref={containerRef} style={styles.container} />;
}

// 색상 토큰을 받아 컨테이너 스타일 생성 (Quill 내부 스타일은 quill-dark.css로 별도 관리)
const makeStyles = (c) => ({
  container: { minHeight: '400px', background: c.bg },
});
