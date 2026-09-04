// data/employees.ts — 44명 직원 마스터 데이터 (각 부서 레드팀 포함)
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
  채용:     '#f06595',
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

  // ── 채용팀 (HIRE) — 조직 설계·인력 기획
  { id: 'E30', name: '윤서영', code: 'HIRE',   role: '팀장', dept: '채용', deptColor: DEPT_COLORS.채용, speech: '조직 구조 분석 중이에요', emoji: '🏗️', homeX: 5, homeY: 11 },
  { id: 'E31', name: '정민호', code: 'HIRE2',  role: '기획담당', dept: '채용', deptColor: DEPT_COLORS.채용, speech: '인력 배치 최적화 검토 중', emoji: '🧩', homeX: 6, homeY: 11 },

  // ── 레드팀 (각 부서 1명씩 — 비판적 검토·반대 의견 전담)
  { id: 'R01', name: '강현석', code: 'RED_SCOUT',  role: '레드팀', dept: '시장조사', deptColor: DEPT_COLORS.시장조사, speech: '그 데이터 근거가 약한데요', emoji: '🔴', homeX: 3, homeY: 1 },
  { id: 'R02', name: '이태준', code: 'RED_DEAL',   role: '레드팀', dept: '영업', deptColor: DEPT_COLORS.영업, speech: '이 딜 리스크부터 봐야죠', emoji: '🔴', homeX: 6, homeY: 1 },
  { id: 'R03', name: '박소현', code: 'RED_PLAN',   role: '레드팀', dept: '기획', deptColor: DEPT_COLORS.기획, speech: '사용자가 정말 원하는 건지?', emoji: '🔴', homeX: 4, homeY: 3, repos: ['familyproject', 'sentence-collector'] },
  { id: 'R04', name: '김영철', code: 'RED_GUARD',  role: '레드팀', dept: '검수', deptColor: DEPT_COLORS.검수, speech: '이 테스트로는 부족합니다', emoji: '🔴', homeX: 6, homeY: 3, repos: ['familyproject', 'sentence-collector'] },
  { id: 'R05', name: '나윤아', code: 'RED_BUILD',  role: '레드팀', dept: '개발', deptColor: DEPT_COLORS.개발, speech: '기술 부채 쌓이고 있어요', emoji: '🔴', homeX: 5, homeY: 5, repos: ['familyproject', 'sentence-collector'] },
  { id: 'R06', name: '장세훈', code: 'RED_SHIP',   role: '레드팀', dept: '배포', deptColor: DEPT_COLORS.배포, speech: '롤백 플랜 없이 배포요?', emoji: '🔴', homeX: 7, homeY: 5, repos: ['familyproject', 'sentence-collector'] },
  { id: 'R07', name: '허지민', code: 'RED_VOICE',  role: '레드팀', dept: '고객소통', deptColor: DEPT_COLORS.고객소통, speech: '고객 불만 패턴이 보여요', emoji: '🔴', homeX: 3, homeY: 7, repos: ['sentence-collector'] },
  { id: 'R08', name: '신동혁', code: 'RED_CASH',   role: '레드팀', dept: '정산', deptColor: DEPT_COLORS.정산, speech: '이 지출 타당성 재검토요', emoji: '🔴', homeX: 5, homeY: 7 },
  { id: 'R09', name: '류미경', code: 'RED_RETRO',  role: '레드팀', dept: '회고', deptColor: DEPT_COLORS.회고, speech: '같은 실수 반복하고 있어요', emoji: '🔴', homeX: 7, homeY: 7 },
  { id: 'R10', name: '전승우', code: 'RED_OPS',    role: '레드팀', dept: '운영', deptColor: DEPT_COLORS.운영, speech: '장애 대비 허점이 있습니다', emoji: '🔴', homeX: 3, homeY: 9, repos: ['familyproject', 'sentence-collector'] },
  { id: 'R11', name: '홍다은', code: 'RED_AIDE',   role: '레드팀', dept: '비서', deptColor: DEPT_COLORS.비서, speech: '일정 충돌 위험 감지', emoji: '🔴', homeX: 5, homeY: 9 },
  { id: 'R12', name: '오정훈', code: 'RED_REPO',   role: '레드팀', dept: '레포', deptColor: DEPT_COLORS.레포, speech: '머지 충돌 위험 있어요', emoji: '🔴', homeX: 7, homeY: 9, repos: ['familyproject', 'sentence-collector'] },
  { id: 'R13', name: '임수아', code: 'RED_HIRE',   role: '레드팀', dept: '채용', deptColor: DEPT_COLORS.채용, speech: '이 구조로는 병목 생겨요', emoji: '🔴', homeX: 7, homeY: 11 },
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
// 외부 스킬 레포 출처:
//   [MKT] coreyhaines31/marketingskills  — 50+ 마케팅 전문 스킬
//   [OMNI] diegosouzapw/OmniRoute        — AI 인프라·모델 운영 스킬
//   [VCL] vercel-labs/skills             — 스킬 탐색·설치 CLI
//   [MEM] thedotmack/claude-mem          — 메모리·컨텍스트 관리
//   [GFY] Graphify-Labs/graphify         — 코드 그래프 분석
//   [HR] headroomlabs-ai/headroom        — 에이전트 훅·플러그인
//   [STX] usestrix/strix                 — AI 보안 테스트·펜테스트
//   [L30] mvanhorn/last30days-skill       — Reddit·X·YouTube·HN 30일 트렌드 리서치
//   [CAV] JuliusBrussee/caveman           — 토큰 65% 절감 압축 통신
export interface TeamSkill {
  name: string           // 스킬 슬래시 커맨드명
  label: string          // 표시용
  description: string    // 설명
  icon: string
  source?: string        // 외부 스킬 레포 출처 (MKT/OMNI/VCL/MEM/GFY/HR/STX/L30/CAV)
}

export const DEPT_SKILLS: Record<string, TeamSkill[]> = {
  시장조사: [
    { name: 'WebSearch',          label: '웹 검색',       description: '시장 트렌드·경쟁사 검색',           icon: '🔍' },
    { name: 'WebFetch',           label: '웹 수집',       description: 'URL 콘텐츠 크롤링',                 icon: '🌐' },
    { name: 'browse',             label: '브라우징',      description: '웹 브라우저 탐색',                   icon: '🖥️' },
    { name: 'competitor-profiling',label: '경쟁사 분석',  description: '경쟁사 비교·대안 페이지 생성',       icon: '⚔️', source: 'MKT' },
    { name: 'customer-research',  label: '고객 리서치',   description: '타겟 고객 페르소나·니즈 분석',       icon: '🎯', source: 'MKT' },
    { name: 'marketing-psychology',label: '심리 분석',    description: '소비자 심리·행동 패턴 분석',         icon: '🧠', source: 'MKT' },
    { name: 'last30days',         label: '30일 트렌드',  description: 'Reddit·X·YouTube·HN 30일 트렌드 리서치', icon: '📡', source: 'L30' },
  ],
  영업: [
    { name: 'gmail:search',       label: '메일 검색',     description: '고객 문의 메일 검색',                icon: '📧' },
    { name: 'notion:search',      label: '노션 검색',     description: '제안서·견적서 검색',                 icon: '📋' },
    { name: 'supabase:query',     label: 'DB 조회',       description: '클라이언트·프로젝트 조회',           icon: '🗄️' },
    { name: 'prospecting',        label: '잠재고객 발굴', description: '아웃바운드 잠재고객 리서치·접근',     icon: '🎣', source: 'MKT' },
    { name: 'cold-email',         label: '콜드메일',      description: '초기 접근용 콜드 이메일 작성',       icon: '📩', source: 'MKT' },
    { name: 'sales-enablement',   label: '영업 자료',     description: '배틀카드·경쟁 비교·세일즈 콘텐츠',   icon: '🗂️', source: 'MKT' },
    { name: 'pricing',            label: '가격 전략',     description: '가격 책정·패키징 최적화',            icon: '💲', source: 'MKT' },
    { name: 'last30days',         label: '30일 트렌드',  description: '시장·고객 30일간 SNS 트렌드 분석',   icon: '📡', source: 'L30' },
  ],
  기획: [
    { name: 'notion:create',      label: '노션 작성',     description: 'PRD·스펙 문서 작성',                 icon: '📝' },
    { name: 'figma:design',       label: '피그마',        description: '와이어프레임·UI 디자인',             icon: '🎨' },
    { name: 'brainstorming',      label: '브레인스토밍',  description: '아이디어 발산·정리',                 icon: '💡' },
    { name: 'content-strategy',   label: '콘텐츠 전략',   description: '콘텐츠 기획·채널 전략 수립',         icon: '📰', source: 'MKT' },
    { name: 'product-marketing',  label: '제품 마케팅',   description: 'ICP·포지셔닝·메시징 전략',           icon: '🎯', source: 'MKT' },
    { name: 'marketing-plan',     label: '마케팅 플랜',   description: 'AARRR 기반 12개월 마케팅 로드맵',    icon: '📋', source: 'MKT' },
    { name: 'find-skills',        label: '스킬 탐색',     description: '필요한 에이전트 스킬 검색·설치',     icon: '🔎', source: 'VCL' },
    { name: 'last30days',         label: '30일 트렌드',  description: '제품·기술 30일 트렌드 리서치',       icon: '📡', source: 'L30' },
  ],
  검수: [
    { name: 'code-review',        label: '코드 리뷰',     description: '코드 품질·보안 리뷰',                icon: '🔎' },
    { name: 'security-review',    label: '보안 리뷰',     description: 'RLS·env·인젝션 검사',                icon: '🛡️' },
    { name: 'Bash',               label: '테스트 실행',   description: 'npm test · lint 실행',               icon: '🧪' },
    { name: 'omni-eval',          label: 'AI 평가',       description: 'AI 모델 출력 품질 평가·벤치마크',    icon: '📏', source: 'OMNI' },
    { name: 'cli-policy-audit',   label: '정책 감사',     description: '보안 정책·규정 준수 자동 감사',      icon: '📜', source: 'OMNI' },
    { name: 'graphify',           label: '코드 그래프',   description: '코드베이스 의존성 그래프 분석',      icon: '🕸️', source: 'GFY' },
    { name: 'strix:vuln-scan',    label: '취약점 스캔',   description: '코드 보안 취약점 AI 탐지·PoC 검증', icon: '🔓', source: 'STX' },
    { name: 'strix:owasp',        label: 'OWASP 검사',   description: 'OWASP Top 10 기반 보안 테스트',      icon: '🏴', source: 'STX' },
  ],
  개발: [
    { name: 'Read',               label: '코드 읽기',     description: '소스 파일 분석',                      icon: '📖' },
    { name: 'Write',              label: '코드 작성',     description: '파일 생성·전체 교체',                 icon: '✏️' },
    { name: 'Edit',               label: '코드 수정',     description: '정밀 코드 편집',                      icon: '🔧' },
    { name: 'Bash',               label: '커맨드 실행',   description: 'npm·git·CLI 명령',                    icon: '⚡' },
    { name: 'omni-inference',     label: 'AI 추론',       description: 'LLM 추론 엔진·모델 호출 관리',       icon: '🤖', source: 'OMNI' },
    { name: 'omni-models',        label: '모델 관리',     description: 'AI 모델 목록·버전·전환 관리',        icon: '🧬', source: 'OMNI' },
    { name: 'omni-mcp',           label: 'MCP 연동',      description: 'MCP 서버 연결·도구 관리',            icon: '🔌', source: 'OMNI' },
    { name: 'graphify',           label: '코드 그래프',   description: '코드 구조·의존성 시각화',            icon: '🕸️', source: 'GFY' },
    { name: 'strix:code-sec',     label: '코드 보안',     description: '소스 코드 보안 취약점 자동 탐지',    icon: '🔐', source: 'STX' },
    { name: 'find-skills',        label: '스킬 탐색',     description: '필요한 에이전트 스킬 검색·설치',     icon: '🔎', source: 'VCL' },
    { name: 'caveman',            label: '토큰 절감',    description: '토큰 65% 절감 압축 통신 모드',       icon: '🪨', source: 'CAV' },
  ],
  배포: [
    { name: 'vercel:deploy',      label: 'Vercel 배포',   description: 'Vercel 프로덕션 배포',               icon: '🚀' },
    { name: 'gh:pr',              label: 'GitHub PR',     description: 'PR 생성·머지',                       icon: '🔀' },
    { name: 'Bash',               label: '빌드 확인',     description: 'npm run build 실행',                 icon: '📦' },
    { name: 'omni-resilience',    label: '장애 대응',     description: '폴백·재시도·서킷브레이커 설정',      icon: '🛟', source: 'OMNI' },
    { name: 'omni-cache',         label: '캐시 관리',     description: '응답 캐시·CDN 최적화',               icon: '⚡', source: 'OMNI' },
    { name: 'omni-tunnels',       label: '터널 관리',     description: '로컬 터널·프리뷰 배포',              icon: '🚇', source: 'OMNI' },
    { name: 'strix:ci-sec',       label: 'CI 보안 스캔',  description: 'PR마다 자동 보안 스캔·SARIF 리포트', icon: '🛡️', source: 'STX' },
  ],
  고객소통: [
    { name: 'gmail:send',         label: '메일 발송',     description: '고객 응대 메일 작성',                 icon: '📨' },
    { name: 'kakao:chat',         label: '카카오 메모',   description: '카카오톡 메모 전송',                  icon: '💬' },
    { name: 'notion:update',      label: '피드백 기록',   description: '피드백 노션 DB 기록',                 icon: '📋' },
    { name: 'onboarding',         label: '온보딩 설계',   description: '신규 고객 온보딩 플로우 설계',       icon: '🚪', source: 'MKT' },
    { name: 'emails',             label: '이메일 시퀀스', description: '자동 이메일 시퀀스 설계·최적화',     icon: '📮', source: 'MKT' },
    { name: 'churn-prevention',   label: '이탈 방지',     description: '고객 이탈 예측·방지 전략',           icon: '🔒', source: 'MKT' },
    { name: 'community-marketing',label: '커뮤니티',      description: '고객 커뮤니티 구축·운영 전략',       icon: '👥', source: 'MKT' },
    { name: 'last30days',         label: '30일 트렌드',  description: '고객 반응·SNS 30일 트렌드 분석',     icon: '📡', source: 'L30' },
  ],
  정산: [
    { name: 'supabase:query',     label: 'DB 조회',       description: '거래·정산 데이터 조회',               icon: '🗄️' },
    { name: 'xlsx',               label: '엑셀 생성',     description: '정산표·세금계산서 생성',              icon: '📊' },
    { name: 'pdf',                label: 'PDF 생성',      description: '청구서·리포트 PDF',                   icon: '📄' },
    { name: 'revops',             label: '매출 운영',     description: '매출 파이프라인·전환율 분석',         icon: '💹', source: 'MKT' },
    { name: 'analytics',          label: '분석 추적',     description: 'GA4·이벤트 트래킹 설정·분석',        icon: '📈', source: 'MKT' },
    { name: 'attribution',        label: '기여도 분석',   description: '마케팅 채널별 매출 기여도 분석',     icon: '🎯', source: 'MKT' },
  ],
  회고: [
    { name: 'notion:create',      label: '회고 작성',     description: '스프린트 회고 문서 작성',             icon: '📖' },
    { name: 'Artifact',           label: '리포트 생성',   description: '시각화 리포트 페이지',               icon: '📈' },
    { name: 'brainstorming',      label: '회고 분석',     description: 'KPT·4L 회고 프레임워크',             icon: '🧠' },
    { name: 'claude-mem:report',  label: '패턴 분석',     description: '반복 실수·안티패턴 탐지·리포트',     icon: '🔁', source: 'MEM' },
    { name: 'marketing-council',  label: '마케팅 리뷰',   description: '마케팅 전략 합의·우선순위 결정',     icon: '🏛️', source: 'MKT' },
    { name: 'last30days',         label: '30일 트렌드',  description: '지난 30일 이슈·트렌드 회고 분석',    icon: '📡', source: 'L30' },
  ],
  운영: [
    { name: 'vercel:logs',        label: '서버 로그',     description: 'Vercel 런타임 로그 확인',             icon: '📋' },
    { name: 'supabase:logs',      label: 'DB 로그',       description: 'Supabase 쿼리 로그',                 icon: '🗄️' },
    { name: 'Bash',               label: '모니터링',      description: '서버 상태·헬스체크',                 icon: '🔒' },
    { name: 'omni-providers',     label: 'AI 프로바이더', description: 'AI 서비스 프로바이더 상태·전환',     icon: '☁️', source: 'OMNI' },
    { name: 'omni-budget',        label: '비용 관리',     description: 'AI API 비용 추적·예산 제한',         icon: '💰', source: 'OMNI' },
    { name: 'omni-db-backups',    label: 'DB 백업',       description: '데이터베이스 백업·복원 관리',        icon: '💾', source: 'OMNI' },
    { name: 'omni-usage-logs',    label: '사용량 로그',   description: 'API 사용량 추적·리포트',             icon: '📊', source: 'OMNI' },
    { name: 'cli-health',         label: '헬스 체크',     description: '전체 인프라 상태 진단',              icon: '🩺', source: 'OMNI' },
    { name: 'strix:pentest',      label: '펜테스트',     description: '웹앱 자동 침투 테스트·취약점 검증', icon: '🏴‍☠️', source: 'STX' },
    { name: 'caveman',            label: '토큰 절감',    description: 'AI 토큰 비용 65% 절감 압축 모드',    icon: '🪨', source: 'CAV' },
  ],
  비서: [
    { name: 'schedule',           label: '일정 관리',     description: '스케줄·리마인더 관리',                icon: '📅' },
    { name: 'notion:search',      label: '문서 검색',     description: '전사 문서·회의록 검색',               icon: '🔍' },
    { name: 'gmail:draft',        label: '메일 초안',     description: '메일 초안 작성',                      icon: '✉️' },
    { name: 'claude-mem:plan',    label: '플랜 관리',     description: '프로젝트 계획·진행상황 추적',        icon: '📌', source: 'MEM' },
    { name: 'claude-mem:context', label: '컨텍스트',      description: '대화 맥락·이전 결정사항 기억',       icon: '🧠', source: 'MEM' },
    { name: 'headroom:hooks',     label: '에이전트 훅',   description: '자동화 훅·트리거 관리',              icon: '🪝', source: 'HR' },
  ],
  레포: [
    { name: 'gh:repos',           label: 'GitHub 조회',   description: '레포·커밋·PR 현황',                   icon: '🔗' },
    { name: 'Bash:git',           label: 'Git 명령',      description: 'git log·diff·status',                icon: '📂' },
    { name: 'code-review',        label: '코드 분석',     description: '코드베이스 구조 분석',                icon: '🔎' },
    { name: 'omni-github-skills', label: 'GitHub 스킬',   description: 'GitHub 이슈·PR·액션 자동화',         icon: '🐙', source: 'OMNI' },
    { name: 'graphify',           label: '코드 그래프',   description: '레포 아키텍처·의존성 그래프',        icon: '🕸️', source: 'GFY' },
  ],
  채용: [
    { name: 'org:analyze',        label: '조직 분석',     description: '현재 부서 구조·인력 현황 분석',       icon: '📊' },
    { name: 'org:propose',        label: '부서 제안',     description: '신규 부서·역할 신설 제안',            icon: '🏗️' },
    { name: 'org:evaluate',       label: '인력 검토',     description: '충원 필요성·적정 인원 검토',          icon: '🧩' },
    { name: 'omni-agents-a2a',    label: 'A2A 에이전트',  description: '에이전트 간 협업·역할 분배 설계',    icon: '🤝', source: 'OMNI' },
  ],
}
