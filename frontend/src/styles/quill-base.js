// Quill 본문 가독성 향상 — 다크/라이트 무관하게 항상 적용.
export const QUILL_BASE_CSS = `
.ql-editor { font-size: 16px; line-height: 1.75; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
.ql-editor h1 { font-size: 2em; margin: 1em 0 .5em; line-height: 1.3; }
.ql-editor h2 { font-size: 1.5em; margin: 1.2em 0 .5em; line-height: 1.35; font-weight: 700; }
.ql-editor h3 { font-size: 1.2em; margin: 1em 0 .4em; line-height: 1.4; font-weight: 600; }
.ql-editor p  { margin: .5em 0; }
.ql-editor ul, .ql-editor ol { padding-left: 1.2em; }
.ql-editor li { margin: .25em 0; }
.ql-editor blockquote { margin: .8em 0; padding: .3em .8em; border-left: 3px solid currentColor; opacity: .85; }
.ql-editor pre.ql-syntax { padding: 12px 14px; border-radius: 6px; font-size: 14px; line-height: 1.55; }
.ql-container.ql-snow { border: 0 !important; }
`;
