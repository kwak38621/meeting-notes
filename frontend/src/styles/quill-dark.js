// Quill 에디터는 클래스 기반 CSS라 inline style로 색을 못 바꿈. mode가 dark일 때만
// <style id="quill-dark-overrides">를 document.head에 주입.
export const QUILL_DARK_CSS = `
.ql-toolbar.ql-snow { background: #161b22; border-color: #30363d !important; }
.ql-toolbar .ql-stroke { stroke: #c9d1d9; }
.ql-toolbar .ql-fill { fill: #c9d1d9; }
.ql-toolbar .ql-picker-label { color: #c9d1d9; }
.ql-toolbar button:hover .ql-stroke,
.ql-toolbar .ql-picker-label:hover { color: #58a6ff; }
.ql-toolbar button:hover .ql-stroke { stroke: #58a6ff; }
.ql-container.ql-snow { background: #0d1117; border-color: #30363d !important; color: #c9d1d9; }
.ql-editor { color: #c9d1d9; }
.ql-editor.ql-blank::before { color: #8b949e; }
.ql-picker-options { background: #161b22 !important; border-color: #30363d !important; color: #c9d1d9; }
.ql-snow .ql-tooltip { background: #161b22; border-color: #30363d; color: #c9d1d9; box-shadow: 0 4px 12px rgba(0,0,0,.5); }
.ql-snow .ql-tooltip input[type=text] { background: #0d1117; color: #c9d1d9; border-color: #30363d; }
.ql-editor blockquote { border-left-color: #30363d; color: #8b949e; }
.ql-editor pre.ql-syntax { background: #0d1117; color: #c9d1d9; }
`;
