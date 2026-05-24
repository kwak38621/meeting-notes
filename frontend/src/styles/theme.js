// 라이트/다크 테마 색상 팔레트. ThemeContext에서 현재 모드의 객체를 colors로 노출.
export const lightColors = {
  bg: '#ffffff',
  sidebarBg: '#f7f6f3',
  border: '#e8e5de',
  text: '#2f2f2f',
  textMuted: '#787774',
  accent: '#2383e2',
  hoverBg: '#efefef',
  selectedBg: '#e8f0fe',
  inputBg: '#ffffff',
  shadow: '0 4px 12px rgba(0,0,0,.08)',
  modalOverlay: 'rgba(0,0,0,.35)',
  danger: '#e03e3e',
};

export const darkColors = {
  bg: '#0d1117',
  sidebarBg: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
  accent: '#58a6ff',
  hoverBg: '#1f242c',
  selectedBg: '#1f6feb33',
  inputBg: '#0d1117',
  shadow: '0 4px 12px rgba(0,0,0,.5)',
  modalOverlay: 'rgba(0,0,0,.6)',
  danger: '#f85149',
};

export const themes = { light: lightColors, dark: darkColors };
