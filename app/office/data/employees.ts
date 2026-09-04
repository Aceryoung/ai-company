// data/employees.ts — 29명 직원 마스터 데이터
import type { Employee } from '../store/officeStore'

// ── GitHub 레포 목록
export const REPOS = {
  familyproject:      { name: 'familyproject',      full: 'Aceryoung/familyproject',      stack: 'Next.js + Supabase + Python', desc: '가족 장소 관리 앱', url: 'https://github.com/Aceryoung/familyproject' },
  'sentence-collector': { name: 'sentence-collector', full: 'Aceryoung/sentence-collector', stack: 'Next.js + Supabase',          desc: '글적 — 문장 수집 앱', url: 'https://github.com/Aceryoung/sentence-collector' },
} as const

export type RepoName = keyof typeof REPOS

// 부서 색상
export const DEPT_COLORS: Record<string, string> = {
  시장조사: '#ff6b6b',
  영업:     '#ffa94d',
  기획:     '#ffd43b',
  검수:     '#69db7c',
  개발:     '#4dabf7',
  배포:     '#9775fa',
  고객소통: '#e599f7',
  정산:     '#20c997',
  회고:     '#ff922b',
  운영:     '#868e96',
  비서:     '#4af',
  레포:     '#74c0fc',
}

export const EMPLOYEES: Employee[] = [
  // ── 시장조사팀 (SCOUT) — 공통 지원
  { id: 'E01', name: '박서준', code: 'SCOUT',  role: '팀장', dept: '시장조사', deptColor: DEPT_COLORS.시장조사, speech: '시장 트렌드 분석 완료!', emoji: '🔍', homeX: 1, homeY: 1 },
  { id: 'E02', name: '정유진', code: 'SCOUT2', role: '리서처', dept: '시장조사', deptColor: DEPT_COLORS.시장조사, speech: '경쟁사 동향 파악 중…', emoji: '📊', homeX: 2, homeY: 1 },

  // ── 영업팀 (DEAL) — 공통 지원
  { id: 'E03', name: '한미래', code: 'DEAL',   role: '팀장', dept: '영업', deptColor: DEPT_COLORS.영업, speech: '신규 문의 3건 접수!', emoji: '🤝', homeX: 3, homeY: 1 },
  { id: 'E04', name: '최수빈', code: 'DEAL2',  role: '영업담당', dept: '영업', deptColor: DEPT_COLORS.영업, speech: '클라이언트 미팅 준비 중', emoji: '📞', homeX: 4, homeY: 1 },
  { id: 'E05', name: '임하늘', code: 'DEAL3',  role: '영업담당', dept: '영업', deptColor: DEPT_COLORS.영업, speech: '견적서 발송 완료', emoji: '📋', homeX: 5, homeY: 1 },

  // ── 기획팀 (PLAN) — familyproject + sentence-collector
  { id: 'E06', name: '김도현', code: 'PLAN',   role: '팀장', dept: '기획', deptColor: DEPT_COLORS.기획, speech: 'PRD 초안 작성 중…', emoji: '📝', homeX: 1, homeY: 3, repos: ['familyproject', 'sentence-collector'] },
  { id: 'E07', name: '이서아', code: 'PLAN2',  role: '기획자', dept: '기획', deptColor: DEPT_COLORS.기획, speech: '와이어프레임 완료!', emoji: '🎨', homeX: 2, homeY: 3, repos: ['familyproject'] },
  { id: 'E08', name: '남지호', code: 'PLAN3',  role: '기획자', dept: '기획', deptColor: DEPT_COLORS.기획, speech: 'UX 리서치 진행 중', emoji: '🧩', homeX: 3, homeY: 3, repos: ['sentence-collector'] },

  // ── 검수팀 (GUARD) — familyproject + sentence-collector
  { id: 'E09', name: '장하윤', code: 'GUARD',  role: '팀장', dept: '검수', deptColor: DEPT_COLORS.검수, speech: '코드 리뷰 시작합니다', emoji: '🛡️', homeX: 4, homeY: 3, repos: ['familyproject', 'sentence-collector'] },
  { id: 'E10', name: '백현우', code: 'GUARD2', role: 'QA', dept: '검수', deptColor: DEPT_COLORS.검수, speech: '테스트 케이스 작성 중', emoji: '🧪', homeX: 5, homeY: 3, repos: ['sentence-collector'] },

  // ── 개발팀 (BUILD) — familyproject + sentence-collector
  { id: 'E11', name: '권민준', code: 'BUILD',  role: '팀장', dept: '개발', deptColor: DEPT_COLORS.개발, speech: '빌드 파이프라인 가동!', emoji: '⚙️', homeX: 1, homeY: 5, repos: ['familyproject', 'sentence-collector'] },
  { id: 'E12', name: '조예린', code: 'BUILD2', role: '프론트', dept: '개발', deptColor: DEPT_COLORS.개발, speech: 'React 컴포넌트 작업 중', emoji: '💻', homeX: 2, homeY: 5, repos: ['familyproject'] },
  { id: 'E13', name: '서준혁', code: 'BUILD3', role: '백엔드', dept: '개발', deptColor: DEPT_COLORS.개발, speech: 'API 엔드포인트 구현 중', emoji: '🖥️', homeX: 3, homeY: 5, repos: ['familyproject'] },
  { id: 'E14', name: '윤다은', code: 'BUILD4', role: '풀스택', dept: '개발', deptColor: DEPT_COLORS.개발, speech: 'DB 스키마 설계 완료', emoji: '🗄️', homeX: 4, homeY: 5, repos: ['sentence-collector'] },

  // ── 배포팀 (SHIP) — familyproject + sentence-collector
  { id: 'E15', name: '신예준', code: 'SHIP',   role: '팀장', dept: '배포', deptColor: DEPT_COLORS.배포, speech: '배포 준비 완료!', emoji: '🚀', homeX: 5, homeY: 5, repos: ['familyproject', 'sentence-collector'] },
  { id: 'E16', name: '안소율', code: 'SHIP2',  role: 'DevOps', dept: '배포', deptColor: DEPT_COLORS.배포, speech: 'CI/CD 파이프라인 점검', emoji: '🔧', homeX: 6, homeY: 5, repos: ['familyproject'] },

  // ── 고객소통팀 (VOICE) — sentence-collector (사용자 피드백)
  { id: 'E17', name: '문지아', code: 'VOICE',  role: '팀장', dept: '고객소통', deptColor: DEPT_COLORS.고객소통, speech: '고객 피드백 수집 중', emoji: '💬', homeX: 1, homeY: 7, repos: ['sentence-collector'] },
  { id: 'E18', name: '김서윤', code: 'VOICE2', role: 'CS', dept: '고객소통', deptColor: DEPT_COLORS.고객소통, speech: '문의 답변 작성 중', emoji: '📧', homeX: 2, homeY: 7, repos: ['familyproject'] },

  // ── 정산팀 (CASH) — 공통 지원
  { id: 'E19', name: '오재민', code: 'CASH',   role: '팀장', dept: '정산', deptColor: DEPT_COLORS.정산, speech: '이번 달 정산 처리 중', emoji: '💰', homeX: 3, homeY: 7 },
  { id: 'E20', name: '유하영', code: 'CASH2',  role: '경리', dept: '정산', deptColor: DEPT_COLORS.정산, speech: '세금계산서 발행 완료', emoji: '🧾', homeX: 4, homeY: 7 },

  // ── 회고팀 (RETRO) — 공통 지원
  { id: 'E21', name: '황채은', code: 'RETRO',  role: '팀장', dept: '회고', deptColor: DEPT_COLORS.회고, speech: '스프린트 회고 준비 중', emoji: '📖', homeX: 5, homeY: 7 },
  { id: 'E22', name: '송민규', code: 'RETRO2', role: '분석가', dept: '회고', deptColor: DEPT_COLORS.회고, speech: 'KPI 분석 리포트 작성', emoji: '📈', homeX: 6, homeY: 7 },

  // ── 운영팀 (OPS) — familyproject + sentence-collector
  { id: 'E23', name: '강태오', code: 'OPS',    role: '팀장', dept: '운영', deptColor: DEPT_COLORS.운영, speech: '서버 모니터링 정상', emoji: '🖧', homeX: 1, homeY: 9, repos: ['familyproject', 'sentence-collector'] },
  { id: 'E24', name: '노은지', code: 'OPS2',   role: '운영', dept: '운영', deptColor: DEPT_COLORS.운영, speech: '인프라 점검 완료', emoji: '🔒', homeX: 2, homeY: 9, repos: ['familyproject'] },

  // ── 비서팀 (AIDE) — 공통 지원
  { id: 'E25', name: '이수연', code: 'AIDE',   role: '수석비서', dept: '비서', deptColor: DEPT_COLORS.비서, speech: '스케줄 조율 중이에요', emoji: '📌', homeX: 3, homeY: 9 },
  { id: 'E26', name: '차민서', code: 'AIDE2',  role: '비서', dept: '비서', deptColor: DEPT_COLORS.비서, speech: '회의록 정리 완료', emoji: '📎', homeX: 4, homeY: 9 },

  // ── 레포팀 (REPO) — familyproject + sentence-collector
  { id: 'E27', name: '고은채', code: 'REPO',   role: '팀장', dept: '레포', deptColor: DEPT_COLORS.레포, speech: 'GitHub 커밋 현황 체크', emoji: '🔗', homeX: 5, homeY: 9, repos: ['familyproject', 'sentence-collector'] },
  { id: 'E28', name: '배지훈', code: 'REPO2',  role: '관리자', dept: '레포', deptColor: DEPT_COLORS.레포, speech: 'PR 리뷰 대기 중', emoji: '📂', homeX: 6, homeY: 9, repos: ['familyproject'] },
  { id: 'E29', name: '한소희', code: 'REPO3',  role: '관리자', dept: '레포', deptColor: DEPT_COLORS.레포, speech: '브랜치 정리 완료', emoji: '🌿', homeX: 7, homeY: 9, repos: ['sentence-collector'] },
]

// 부서별 그룹
export function getEmployeesByDept() {
  const map = new Map<string, Employee[]>()
  for (const emp of EMPLOYEES) {
    const list = map.get(emp.dept) ?? []
    list.push(emp)
    map.set(emp.dept, list)
  }
  return map
}

// 팀장 목록
export function getTeamLeaders() {
  return EMPLOYEES.filter(e => e.role === '팀장' || e.role === '수석비서')
}

// 레포별 담당 직원
export function getEmployeesByRepo(repo: string) {
  return EMPLOYEES.filter(e => e.repos?.includes(repo))
}

// 레포별 담당 부서 요약
export function getRepoDeptSummary(repo: string) {
  const emps = getEmployeesByRepo(repo)
  const depts = new Map<string, string[]>()
  for (const e of emps) {
    const list = depts.get(e.dept) ?? []
    list.push(e.name)
    depts.set(e.dept, list)
  }
  return depts
}

// 상태 색상
export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  idle: { bg: '#1a2332', text: '#6b8cbb', label: '대기' },
  work: { bg: '#001a00', text: '#0f0',    label: '작업중' },
  done: { bg: '#0a1628', text: '#4af',    label: '완료' },
  boss: { bg: '#1a0800', text: '#f80',    label: '보고중' },
  link: { bg: '#1a0033', text: '#bf5af2', label: '연동대기' },
}

// ── 팀별 Claude 내장 스킬 매핑
// 해당 부서에 지시하면 AI가 자동으로 이 도구들을 활용
export interface TeamSkill {
  name: string           // 스킬 슬래시 커맨드명
  label: string          // 표시용
  description: string    // 설명
  icon: string
}

export const DEPT_SKILLS: Record<string, TeamSkill[]> = {
  시장조사: [
    { name: 'WebSearch',     label: '웹 검색',     description: '시장 트렌드·경쟁사 검색', icon: '🔍' },
    { name: 'WebFetch',      label: '웹 수집',     description: 'URL 콘텐츠 크롤링',       icon: '🌐' },
    { name: 'browse',        label: '브라우징',    description: '웹 브라우저 탐색',         icon: '🖥️' },
  ],
  영업: [
    { name: 'gmail:search',  label: '메일 검색',   description: '고객 문의 메일 검색',      icon: '📧' },
    { name: 'notion:search', label: '노션 검색',   description: '제안서·견적서 검색',       icon: '📋' },
    { name: 'supabase:query',label: 'DB 조회',     description: '클라이언트·프로젝트 조회', icon: '🗄️' },
  ],
  기획: [
    { name: 'notion:create', label: '노션 작성',   description: 'PRD·스펙 문서 작성',       icon: '📝' },
    { name: 'figma:design',  label: '피그마',      description: '와이어프레임·UI 디자인',   icon: '🎨' },
    { name: 'brainstorming', label: '브레인스토밍', description: '아이디어 발산·정리',       icon: '💡' },
  ],
  검수: [
    { name: 'code-review',   label: '코드 리뷰',   description: '코드 품질·보안 리뷰',      icon: '🔎' },
    { name: 'security-review',label: '보안 리뷰',  description: 'RLS·env·인젝션 검사',      icon: '🛡️' },
    { name: 'Bash',          label: '테스트 실행',  description: 'npm test · lint 실행',     icon: '🧪' },
  ],
  개발: [
    { name: 'Read',          label: '코드 읽기',   description: '소스 파일 분석',            icon: '📖' },
    { name: 'Write',         label: '코드 작성',   description: '파일 생성·전체 교체',       icon: '✏️' },
    { name: 'Edit',          label: '코드 수정',   description: '정밀 코드 편집',            icon: '🔧' },
    { name: 'Bash',          label: '커맨드 실행',  description: 'npm·git·CLI 명령',         icon: '⚡' },
  ],
  배포: [
    { name: 'vercel:deploy', label: 'Vercel 배포', description: 'Vercel 프로덕션 배포',     icon: '🚀' },
    { name: 'gh:pr',         label: 'GitHub PR',   description: 'PR 생성·머지',             icon: '🔀' },
    { name: 'Bash',          label: '빌드 확인',   description: 'npm run build 실행',       icon: '📦' },
  ],
  고객소통: [
    { name: 'gmail:send',    label: '메일 발송',   description: '고객 응대 메일 작성',       icon: '📨' },
    { name: 'kakao:chat',    label: '카카오 메모',  description: '카카오톡 메모 전송',        icon: '💬' },
    { name: 'notion:update', label: '피드백 기록',  description: '피드백 노션 DB 기록',       icon: '📋' },
  ],
  정산: [
    { name: 'supabase:query',label: 'DB 조회',     description: '거래·정산 데이터 조회',     icon: '🗄️' },
    { name: 'xlsx',          label: '엑셀 생성',   description: '정산표·세금계산서 생성',    icon: '📊' },
    { name: 'pdf',           label: 'PDF 생성',    description: '청구서·리포트 PDF',         icon: '📄' },
  ],
  회고: [
    { name: 'notion:create', label: '회고 작성',   description: '스프린트 회고 문서 작성',   icon: '📖' },
    { name: 'Artifact',      label: '리포트 생성', description: '시각화 리포트 페이지',      icon: '📈' },
    { name: 'brainstorming', label: '회고 분석',   description: 'KPT·4L 회고 프레임워크',   icon: '🧠' },
  ],
  운영: [
    { name: 'vercel:logs',   label: '서버 로그',   description: 'Vercel 런타임 로그 확인',   icon: '📋' },
    { name: 'supabase:logs', label: 'DB 로그',     description: 'Supabase 쿼리 로그',       icon: '🗄️' },
    { name: 'Bash',          label: '모니터링',    description: '서버 상태·헬스체크',        icon: '🔒' },
  ],
  비서: [
    { name: 'schedule',      label: '일정 관리',   description: '스케줄·리마인더 관리',      icon: '📅' },
    { name: 'notion:search', label: '문서 검색',   description: '전사 문서·회의록 검색',     icon: '🔍' },
    { name: 'gmail:draft',   label: '메일 초안',   description: '메일 초안 작성',            icon: '✉️' },
  ],
  레포: [
    { name: 'gh:repos',      label: 'GitHub 조회', description: '레포·커밋·PR 현황',         icon: '🔗' },
    { name: 'Bash:git',      label: 'Git 명령',    description: 'git log·diff·status',      icon: '📂' },
    { name: 'code-review',   label: '코드 분석',   description: '코드베이스 구조 분석',      icon: '🔎' },
  ],
}
