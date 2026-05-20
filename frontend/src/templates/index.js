// 6개 회의록 템플릿. content는 Quill 호환 HTML.
export const TEMPLATES = [
  {
    id: 'weekly',
    name: '주간 회의',
    emoji: '📋',
    content: `
<h2>주간 회의</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>안건</h3>
<ol><li></li></ol>
<h3>논의 내용</h3>
<p></p>
<h3>액션 아이템</h3>
<ul><li> </li></ul>
`.trim()
  },
  {
    id: 'oneonone',
    name: '1:1 미팅',
    emoji: '👥',
    content: `
<h2>1:1 미팅</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>지난 액션 점검</h3>
<ul><li></li></ul>
<h3>이번 주 논의</h3>
<p></p>
<h3>다음 액션</h3>
<ul><li></li></ul>
<h3>피드백</h3>
<p></p>
`.trim()
  },
  {
    id: 'retro',
    name: '회고 (KPT)',
    emoji: '🔄',
    content: `
<h2>회고 (KPT)</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>Keep — 잘된 점, 유지할 것</h3>
<ul><li></li></ul>
<h3>Problem — 문제, 어려움</h3>
<ul><li></li></ul>
<h3>Try — 다음에 시도할 것</h3>
<ul><li></li></ul>
`.trim()
  },
  {
    id: 'kickoff',
    name: '프로젝트 킥오프',
    emoji: '🚀',
    content: `
<h2>프로젝트 킥오프</h2>
<p><strong>일시:</strong> </p>
<p><strong>참석자:</strong> </p>
<h3>목표</h3>
<p></p>
<h3>일정 / 주요 마일스톤</h3>
<ul><li></li></ul>
<h3>참여자 / 역할</h3>
<ul><li></li></ul>
<h3>리스크 / 가정</h3>
<ul><li></li></ul>
`.trim()
  },
  {
    id: 'standup',
    name: '데일리 스탠드업',
    emoji: '☀️',
    content: `
<h2>데일리 스탠드업</h2>
<p><strong>날짜:</strong> </p>
<h3>어제 한 일</h3>
<ul><li></li></ul>
<h3>오늘 할 일</h3>
<ul><li></li></ul>
<h3>블로커</h3>
<ul><li></li></ul>
`.trim()
  },
  {
    id: 'interview',
    name: '인터뷰 노트',
    emoji: '🎤',
    content: `
<h2>인터뷰 노트</h2>
<p><strong>후보자:</strong> </p>
<p><strong>일시:</strong> </p>
<h3>평가 항목</h3>
<ul><li>기술 역량: </li><li>커뮤니케이션: </li><li>문화 적합성: </li></ul>
<h3>코멘트</h3>
<p></p>
<h3>결론 / 추천 여부</h3>
<p></p>
`.trim()
  },
];

// id로 템플릿 조회
export const findTemplate = (id) => TEMPLATES.find((t) => t.id === id);
