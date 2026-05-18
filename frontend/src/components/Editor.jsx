// frontend/src/components/Editor.jsx
import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

export default function Editor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

  return <div ref={containerRef} style={{ minHeight: '400px' }} />;
}
