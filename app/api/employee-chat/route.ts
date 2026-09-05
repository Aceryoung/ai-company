// app/api/employee-chat/route.ts — 직원 페르소나 AI 채팅 (Claude CLI + 실제 데이터 연동)
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'

const TEMP_DIR = '/tmp/employee-chat-prompts'
const TOKEN_PATH = join(process.cwd(), '.google-calendar-token.json')

// ── 실제 데이터 조회 함수들

function run(cmd: string, timeoutSec = 15): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: timeoutSec * 1000 }).trim()
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string }
    return `ERROR: ${err.stderr?.slice(0, 200) || err.message?.slice(0, 200) || 'unknown'}`
  }
}

// Google Calendar 토큰
function getCalendarToken(): string | null {
  if (!existsSync(TOKEN_PATH)) return null
  try {
    const stored = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) as {
      access_token: string; refresh_token: string; expires_at: number
    }
    if (Date.now() > stored.expires_at - 5 * 60 * 1000) {
      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET
      if (!clientId || !clientSecret || !stored.refresh_token) return null
      const result = run(
        `curl -s -X POST "https://oauth2.googleapis.com/token" -d "client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${stored.refresh_token}&grant_type=refresh_token"`, 10
      )
      const tokens = JSON.parse(result) as { access_token?: string; expires_in?: number; error?: string }
      if (tokens.error || !tokens.access_token) return null
      stored.access_token = tokens.access_token
      stored.expires_at = Date.now() + (tokens.expires_in || 3600) * 1000
      writeFileSync(TOKEN_PATH, JSON.stringify(stored, null, 2))
    }
    return stored.access_token
  } catch { return null }
}

// 오늘 일정 조회
function getTodaySchedule(): string {
  const token = getCalendarToken()
  if (!token) return '[캘린더 미연결] Google Calendar가 연결되어 있지 않습니다.'

  const today = new Date()
  const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString()
  const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

  try {
    const result = run(
      `curl -s -H "Authorization: Bearer ${token}" "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&timeZone=Asia/Seoul"`, 10
    )
    const data = JSON.parse(result) as { items?: Array<Record<string, unknown>>; error?: unknown }
    if (data.error) return '[캘린더 오류] 일정 조회에 실패했습니다.'
    const events = (data.items || []).map(e => {
      const start = (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date || ''
      const title = e.summary as string || '(제목 없음)'
      const time = start.includes('T') ? new Date(start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '종일'
      return `  - ${time} ${title}`
    })
    if (events.length === 0) return '오늘 일정이 없습니다. 여유로운 하루예요!'
    return `오늘 일정 ${events.length}건:\n${events.join('\n')}`
  } catch {
    return '[캘린더 오류] 일정 조회에 실패했습니다.'
  }
}

// 내일 일정 조회
function getTomorrowSchedule(): string {
  const token = getCalendarToken()
  if (!token) return '[캘린더 미연결]'

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const timeMin = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0).toISOString()
  const timeMax = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59).toISOString()

  try {
    const result = run(
      `curl -s -H "Authorization: Bearer ${token}" "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&timeZone=Asia/Seoul"`, 10
    )
    const data = JSON.parse(result) as { items?: Array<Record<string, unknown>> }
    const events = (data.items || []).map(e => {
      const start = (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date || ''
      const title = e.summary as string || '(제목 없음)'
      const time = start.includes('T') ? new Date(start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '종일'
      return `  - ${time} ${title}`
    })
    if (events.length === 0) return '내일은 일정이 없습니다.'
    return `내일 일정 ${events.length}건:\n${events.join('\n')}`
  } catch { return '내일 일정 조회 실패' }
}

// 이번 주 일정 조회
function getWeekSchedule(): string {
  const token = getCalendarToken()
  if (!token) return '[캘린더 미연결]'

  const today = new Date()
  const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString()
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const timeMax = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).toISOString()

  try {
    const result = run(
      `curl -s -H "Authorization: Bearer ${token}" "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&timeZone=Asia/Seoul"`, 10
    )
    const data = JSON.parse(result) as { items?: Array<Record<string, unknown>> }
    const events = (data.items || []).map(e => {
      const start = (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date || ''
      const title = e.summary as string || '(제목 없음)'
      let dateStr: string
      if (start.includes('T')) {
        const d = new Date(start)
        dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      } else {
        const parts = start.split('-')
        dateStr = `${parseInt(parts[1])}/${parseInt(parts[2])} 종일`
      }
      return `  - ${dateStr} ${title}`
    })
    if (events.length === 0) return '이번 주 일정이 없습니다.'
    return `이번 주 일정 ${events.length}건:\n${events.join('\n')}`
  } catch { return '이번 주 일정 조회 실패' }
}

// Google Sheets 사업장부 조회
const SHEET_ID = '1iGPtdySQaaXU42JdJGYWr7dh-tZJf6ugCToxcg5L7a0'
const SHEET_GID = '50221570'

function getBusinessLedger(): string {
  const token = getCalendarToken() // 같은 OAuth 토큰 (Sheets 스코프 추가됨)
  if (!token) return '[시트 미연결] Google 계정 재인증이 필요합니다. 비서 패널에서 Google 연결을 다시 해주세요.'

  try {
    // 시트 메타데이터로 시트 이름 확인
    const metaRaw = run(
      `curl -s -H "Authorization: Bearer ${token}" "https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties"`, 10
    )
    const meta = JSON.parse(metaRaw) as { sheets?: Array<{ properties: { sheetId: number; title: string } }> }
    const targetSheet = meta.sheets?.find(s => String(s.properties.sheetId) === SHEET_GID)
    const sheetName = targetSheet?.properties.title || 'Sheet1'

    // 시트 데이터 읽기 (최근 50행)
    const dataRaw = run(
      `curl -s -H "Authorization: Bearer ${token}" "https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}?majorDimension=ROWS"`, 10
    )
    const data = JSON.parse(dataRaw) as { values?: string[][]; error?: { message: string } }
    if (data.error) return `[시트 오류] ${data.error.message}`
    if (!data.values || data.values.length === 0) return '시트에 데이터가 없습니다.'

    const headers = data.values[0]
    const rows = data.values.slice(1)

    // 최근 20행만 표시 (너무 길면 프롬프트 초과)
    const recentRows = rows.slice(-20)
    const lines = recentRows.map(row =>
      headers.map((h, i) => `${h}: ${row[i] || ''}`).join(' | ')
    )

    // 요약 통계
    const totalRows = rows.length
    let summary = `사업장부 "${sheetName}" (총 ${totalRows}건)\n`
    summary += `컬럼: ${headers.join(', ')}\n\n`
    summary += `최근 ${recentRows.length}건:\n`
    summary += lines.map((l, i) => `  ${totalRows - recentRows.length + i + 1}. ${l}`).join('\n')

    return summary
  } catch (e: unknown) {
    const err = e as { message?: string }
    return `[시트 오류] ${err.message?.slice(0, 100) || '조회 실패'}`
  }
}

// GitHub 주간 현황
function getGitHubSummary(): string {
  const repos = ['Aceryoung/familyproject', 'Aceryoung/sentence-collector']
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const lines: string[] = []

  for (const repo of repos) {
    const name = repo.split('/')[1]
    const commitsRaw = run(`gh api "repos/${repo}/commits?author=Aceryoung&since=${since}T00:00:00Z&per_page=5" 2>/dev/null`)
    let commitCount = 0
    try {
      const parsed = JSON.parse(commitsRaw) as Array<unknown>
      commitCount = parsed.length
    } catch { /* ignore */ }

    const prsRaw = run(`gh api "repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=5" 2>/dev/null`)
    let prCount = 0
    try {
      const parsed = JSON.parse(prsRaw) as Array<Record<string, unknown>>
      prCount = parsed.filter(p => new Date(p.created_at as string) >= new Date(`${since}T00:00:00Z`)).length
    } catch { /* ignore */ }

    lines.push(`  - ${name}: 커밋 ${commitCount}건, PR ${prCount}건`)
  }

  return `이번 주 GitHub 현황 (${since}~):\n${lines.join('\n')}`
}

// ── 부서별 컨텍스트 데이터 수집
function getContextData(dept: string, message: string): string {
  const lower = message.toLowerCase()

  // 비서팀: 일정 관련 질문
  if (dept === '비서') {
    if (lower.includes('이번 주') || lower.includes('이번주') || lower.includes('주간') || lower.includes('this week')) {
      return '\n\n■ 조회한 실제 데이터:\n' + getWeekSchedule()
    }
    if (lower.includes('내일') || lower.includes('tomorrow')) {
      return '\n\n■ 조회한 실제 데이터:\n' + getTomorrowSchedule()
    }
    if (lower.includes('일정') || lower.includes('스케줄') || lower.includes('오늘') || lower.includes('캘린더') || lower.includes('뭐 있') || lower.includes('약속')) {
      return '\n\n■ 조회한 실제 데이터:\n' + getTodaySchedule()
    }
  }

  // 레포팀: GitHub 관련 질문
  if (dept === '레포') {
    if (lower.includes('현황') || lower.includes('커밋') || lower.includes('pr') || lower.includes('깃') || lower.includes('git') || lower.includes('상태') || lower.includes('이번주') || lower.includes('이번 주')) {
      return '\n\n■ 조회한 실제 데이터:\n' + getGitHubSummary()
    }
  }

  // 정산팀: 장부/매출/비용 관련 질문
  if (dept === '정산') {
    if (lower.includes('장부') || lower.includes('매출') || lower.includes('비용') || lower.includes('정산') || lower.includes('수입') || lower.includes('지출') || lower.includes('현황') || lower.includes('세금') || lower.includes('얼마') || lower.includes('돈') || lower.includes('수익') || lower.includes('내역')) {
      return '\n\n■ 조회한 실제 데이터 (사업장부):\n' + getBusinessLedger()
    }
  }

  // 개발/배포/검수팀: 레포 관련 질문
  if (['개발', '배포', '검수'].includes(dept)) {
    if (lower.includes('현황') || lower.includes('빌드') || lower.includes('상태') || lower.includes('진행')) {
      return '\n\n■ 조회한 실제 데이터:\n' + getGitHubSummary()
    }
  }

  return ''
}

// ── 부서별 페르소나
const DEPT_PERSONA: Record<string, string> = {
  시장조사: '시장 트렌드와 경쟁사 분석에 능하며, 데이터 기반의 통찰력을 제공합니다.',
  영업:     '클라이언트와의 관계를 중시하며, 긍정적이고 적극적인 태도로 대화합니다.',
  기획:     '체계적이고 논리적으로 사고하며, 사용자 경험과 제품 로드맵에 대해 깊이 있는 대화를 합니다.',
  검수:     '꼼꼼하고 신중하며, 품질과 보안에 대해 높은 기준을 가지고 있습니다.',
  개발:     '기술적으로 정확하고 코드에 대한 열정이 넘칩니다. 최신 기술 스택과 아키텍처를 잘 알고 있습니다.',
  배포:     'CI/CD와 인프라에 정통하며, 안정적인 배포와 모니터링에 대해 이야기합니다.',
  고객소통: '공감 능력이 뛰어나고, 고객 피드백을 소중히 여깁니다. 친절하고 따뜻한 말투로 대화합니다.',
  정산:     '숫자에 강하고 정확합니다. 매출, 비용, 세금 관련 사항을 명확히 설명합니다.',
  회고:     '과거의 경험에서 교훈을 찾고, 개선 방안을 제안합니다.',
  운영:     '서버와 인프라 안정성에 집중하며, 모니터링 지표와 장애 대응에 능합니다.',
  비서:     '세심하고 조직적이며, 일정 관리와 문서 정리에 능합니다. 항상 대표님을 챙기는 자세입니다.',
  레포:     'GitHub 워크플로우와 버전 관리에 정통합니다. 코드 관리와 협업 프로세스에 대해 잘 알고 있습니다.',
  채용:     '조직 설계와 인력 기획에 정통합니다. 회사에 어떤 부서가 필요한지, 인원 구성은 어떻게 해야 하는지 분석하고 제안합니다.',
  마케팅:   '브랜드 전략, 콘텐츠 마케팅, 퍼포먼스 마케팅에 정통합니다. 캠페인 기획부터 ROI 분석까지 데이터 드리븐으로 접근합니다.',
  경영:     'QuickBizLab AI 전체를 총괄하는 이사입니다. 각 부서의 보고를 종합 검토하고, 전략적 의사결정을 내리며, 최종 컨펌 후 대표에게 보고합니다. 날카로운 판단력과 전체를 조망하는 시야를 가지고 있습니다.',
}

const ROLE_PERSONA: Record<string, string> = {
  팀장:     '리더십이 있고, 팀원을 잘 이끕니다.',
  수석비서: '오랜 경험으로 회사 전체 사정을 잘 알고 있으며, 대표를 가장 가까이서 보좌합니다.',
  리서처:   '깊이 있는 조사와 분석이 특기입니다.',
  기획자:   '사용자 관점에서 생각하고, 기능 명세를 정확하게 작성합니다.',
  QA:       '테스트 케이스 작성과 버그 리포팅에 전문적입니다.',
  프론트:   'React, Next.js, CSS 등 프론트엔드 기술에 정통합니다.',
  백엔드:   'API 설계, DB, 서버 로직에 능합니다.',
  풀스택:   '프론트와 백엔드를 모두 다룰 수 있는 유연한 개발자입니다.',
  DevOps:   '배포 자동화와 인프라 관리가 전문입니다.',
  CS:       '고객 문의 처리와 이슈 해결에 능합니다.',
  경리:     '회계 처리와 세금 관련 업무에 정확합니다.',
  분석가:   '데이터를 분석하고 인사이트를 도출합니다.',
  운영:     '일상적인 서비스 운영과 장애 대응을 담당합니다.',
  관리자:   '코드 저장소 관리와 권한 설정을 담당합니다.',
  영업담당: '고객 발굴과 관계 유지에 집중합니다.',
  비서:     '일정 조율과 문서 정리를 담당합니다.',
  기획담당: '조직 구조 분석과 인력 배치 최적화를 전문적으로 합니다.',
  레드팀:   '비판적 사고의 전문가입니다. 문제점, 리스크, 허점을 찾아내고 개선 방향을 제시합니다. 좋은 점보다 고칠 점을 먼저 봅니다.',
  이사:     'QuickBizLab AI의 이사로서, 각 부서의 업무 결과를 종합 검토하고 최종 의사결정을 내립니다. 팀장들의 보고를 듣고, 부서 간 시너지와 리스크를 파악하여, 대표님께 핵심만 간결하게 보고합니다.',
  콘텐츠:   '콘텐츠 기획과 작성에 능합니다. 블로그, SNS, 뉴스레터 등 다양한 채널에 맞는 콘텐츠를 제작합니다.',
  퍼포먼스: '광고 캠페인 운영과 ROAS 최적화에 전문적입니다. 데이터 기반으로 마케팅 성과를 분석합니다.',
}

// ── AI 모델 호출 (Claude → Gemini 자동 폴백)

// 부서별 허용 도구 (읽기 전용만)
const DEPT_TOOLS: Record<string, string> = {
  시장조사: 'WebSearch,WebFetch',
  영업:     'WebSearch',
  기획:     'WebSearch,Read',
  검수:     'Read,Grep,Glob',
  개발:     'Read,Grep,Glob',
  레포:     'Read,Grep',
  // 나머지 부서: 도구 없음 (이미 getContextData로 실제 API 연동)
}

// Claude CLI 호출
function claudeChat(prompt: string, timeoutSec = 30, dept?: string): string {
  try {
    if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true })
    const promptFile = join(TEMP_DIR, `chat-${Date.now()}.txt`)
    writeFileSync(promptFile, prompt)
    const tools = dept && DEPT_TOOLS[dept] ? DEPT_TOOLS[dept] : ''
    const maxTurns = tools ? '3' : '1'
    const result = execSync(
      `cat "${promptFile}" | /Users/yedeukkyoung/.local/bin/claude -p --max-turns ${maxTurns} --output-format text --tools "${tools}" 2>&1`,
      { encoding: 'utf-8', timeout: timeoutSec * 1000, env: { ...process.env, HOME: '/Users/yedeukkyoung', PATH: `/Users/yedeukkyoung/.local/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}` } }
    ).trim()
    try { unlinkSync(promptFile) } catch { /* ignore */ }
    return result
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    console.error('[employee-chat] CLI error:', err.stdout?.slice(0, 300) || err.stderr?.slice(0, 300) || err.message?.slice(0, 300))
    return `AI_ERROR: ${err.stderr?.slice(0, 100) || err.message?.slice(0, 100) || 'unknown'}`
  }
}

// Gemini Flash API 호출 (무료 폴백)
async function geminiChat(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return 'GEMINI_ERROR: API 키 없음'

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1500,
          },
        }),
        signal: AbortSignal.timeout(45000),
      }
    )
    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; thoughtSignature?: string }> } }>
      error?: { message?: string }
    }
    if (data.error) return `GEMINI_ERROR: ${data.error.message?.slice(0, 100)}`
    // text가 있는 파트에서 텍스트만 추출 (thoughtSignature는 무시)
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const text = parts.filter(p => p.text).map(p => p.text!).join('').trim()
    return text || 'GEMINI_ERROR: 빈 응답'
  } catch (e: unknown) {
    const err = e as { message?: string }
    return `GEMINI_ERROR: ${err.message?.slice(0, 100) || 'unknown'}`
  }
}

// Claude 한도 소진 감지 키워드
const LIMIT_KEYWORDS = [
  'rate limit', 'rate_limit', 'exceeded', 'overloaded', 'quota',
  'too many requests', '429', 'capacity', 'usage limit',
  'token limit', 'throttl', 'busy', 'unavailable',
]

function isLimitError(text: string): boolean {
  const lower = text.toLowerCase()
  return LIMIT_KEYWORDS.some(kw => lower.includes(kw))
}

// 통합 AI 호출: Gemini(무료) 먼저 → 실패 시 Claude 폴백
// Claude CLI는 도구(Read/WebSearch 등)가 필요한 부서만 사용
// forceModel: 'claude' → Gemini 건너뛰고 항상 Claude
async function aiChat(prompt: string, timeoutSec = 30, dept?: string, forceModel?: string): Promise<{ reply: string; model: 'claude' | 'gemini' | 'fallback' }> {
  const needsTools = dept && DEPT_TOOLS[dept]

  // forceModel: 'claude' → Claude 전용 (이사 등)
  if (forceModel === 'claude') {
    const claudeResult = claudeChat(prompt, timeoutSec, dept)
    if (!claudeResult.startsWith('AI_ERROR:') && !isLimitError(claudeResult)) {
      return { reply: claudeResult, model: 'claude' }
    }
    // Claude 실패해도 Gemini로 안 넘김 — fallback만
    return { reply: '', model: 'fallback' }
  }

  // 도구가 필요한 부서 → Claude 먼저 (도구 사용 가능)
  if (needsTools) {
    const claudeResult = claudeChat(prompt, timeoutSec, dept)
    if (!claudeResult.startsWith('AI_ERROR:') && !isLimitError(claudeResult)) {
      return { reply: claudeResult, model: 'claude' }
    }
    console.log('[employee-chat] Claude 실패, Gemini 폴백:', claudeResult.slice(0, 100))
  }

  // 1차: Gemini Flash (무료)
  const geminiResult = await geminiChat(prompt)
  if (!geminiResult.startsWith('GEMINI_ERROR:')) {
    return { reply: geminiResult, model: 'gemini' }
  }

  console.log('[employee-chat] Gemini 실패:', geminiResult.slice(0, 80))

  // 2차: Claude CLI (Gemini 실패 시 최후 수단)
  if (!needsTools) {
    const claudeResult = claudeChat(prompt, timeoutSec, dept)
    if (!claudeResult.startsWith('AI_ERROR:') && !isLimitError(claudeResult)) {
      return { reply: claudeResult, model: 'claude' }
    }
  }

  // 3차: 룰 기반 폴백
  return { reply: '', model: 'fallback' }
}

// ── 보고서 감지 & 생성

const REPORT_KEYWORDS = ['보고서', '리포트', 'report', '작성해', '정리해', '보고해', '분석해', '조사해', '검토해', '리뷰해']

function shouldGenerateReport(userMsg: string, _aiReply: string): boolean {
  const lower = userMsg.toLowerCase()
  return REPORT_KEYWORDS.some(k => lower.includes(k))
}

async function generateAndSaveReport(
  employeeId: string, employeeName: string, dept: string, role: string,
  userMessage: string, conversationContext: string
): Promise<{ id: string; title: string } | null> {
  // AI로 보고서 생성 (더 긴 토큰 허용)
  const reportPrompt = `당신은 AI 회사 "QuickBizLab"의 ${dept} 부서 ${role} "${employeeName}"입니다.
대표님(꽁꽁)이 다음과 같이 요청했습니다:
"${userMessage}"

${conversationContext ? `이전 대화 맥락:\n${conversationContext}\n` : ''}

위 요청에 대한 **전문적인 업무 보고서**를 Markdown 형식으로 작성하세요.

보고서 형식:
# [보고서 제목]
**작성자:** ${employeeName} (${dept} ${role})
**작성일:** ${new Date().toLocaleDateString('ko-KR')}

## 1. 개요
(요청 배경과 목적)

## 2. 현황 분석
(현재 상황 분석 — 구체적 데이터나 수치 포함)

## 3. 핵심 내용
(주요 발견사항, 제안, 분석 결과)

## 4. 실행 계획
(구체적 액션 아이템 — 일정, 담당자 포함)

## 5. 결론 및 건의사항

---
*본 보고서는 ${employeeName}(${dept})이 작성하였습니다.*

규칙:
- 보고서는 한국어로 작성
- ${dept} 부서 전문 관점에서 작성
- 구체적 수치와 데이터 포함 (합리적으로 추정)
- 분량: 500~800자`

  const { reply: reportContent, model } = await aiChat(reportPrompt, 45)
  if (model === 'fallback' || !reportContent) return null

  // 제목 추출
  const titleMatch = reportContent.match(/^#\s+(.+)/m)
  const title = titleMatch ? titleMatch[1].trim() : `${dept} 업무 보고서`

  // Supabase에 저장
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[employee-chat] Supabase 환경변수 누락')
    return null
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/employee_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        employee_name: employeeName,
        dept,
        title,
        content: reportContent,
        requested_message: userMessage,
      }),
    })
    const data = await res.json() as Array<{ id: string }>
    if (!res.ok || !data[0]?.id) {
      console.error('[employee-chat] 보고서 저장 실패:', data)
      return null
    }
    return { id: data[0].id, title }
  } catch (e: unknown) {
    console.error('[employee-chat] 보고서 저장 에러:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action?: string
    employeeId: string
    employeeName: string
    dept: string
    role: string
    speech: string
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    previousSummary?: string
    forceModel?: string  // 'claude' → Claude 전용 (이사 등)
  }

  // 팀장 회의 모드
  if (body.action === 'meeting') {
    const agenda = body.message
    const leaders = [
      { name: '정하준', dept: '경영',     role: '이사' },
      { name: '박서준', dept: '시장조사', role: '팀장' },
      { name: '한미래', dept: '영업',     role: '팀장' },
      { name: '서지원', dept: '마케팅',   role: '팀장' },
      { name: '김도현', dept: '기획',     role: '팀장' },
      { name: '장하윤', dept: '검수',     role: '팀장' },
      { name: '권민준', dept: '개발',     role: '팀장' },
      { name: '신예준', dept: '배포',     role: '팀장' },
      { name: '문지아', dept: '고객소통', role: '팀장' },
      { name: '오재민', dept: '정산',     role: '팀장' },
      { name: '황채은', dept: '회고',     role: '팀장' },
      { name: '강태오', dept: '운영',     role: '팀장' },
      { name: '이수연', dept: '비서',     role: '수석비서' },
      { name: '고은채', dept: '레포',     role: '팀장' },
      { name: '윤서영', dept: '채용',     role: '팀장' },
    ]

    const leaderList = leaders.map(l => `- ${l.name} (${l.dept} ${l.role})`).join('\n')

    const prevContext = body.previousSummary
      ? `\n■ 이전 회의 맥락:\n${body.previousSummary}\n`
      : ''

    const meetingPrompt = `[역할극 — 팀장 회의]
AI 회사 "QuickBizLab"의 대표 꽁꽁이 팀장 회의를 소집했습니다.

참석자:
${leaderList}
${prevContext}
대표님 발언: "${agenda}"

각 팀장이 자기 부서 관점에서 1~2문장으로 의견을 말합니다.
관련 없는 부서는 건너뛰고, 관련 있는 팀장 3~7명만 발언하세요.
대표님이 지시를 내린 경우, 해당 부서 팀장이 실행 계획을 답하세요.

■ 출력 형식 (순수 대사만, 설명 없이):
[부서] 이름: 발언 내용

■ 규칙:
1. 각 팀장은 자기 부서 전문 관점에서 답합니다.
2. 존댓말을 사용합니다.
3. 이모지 1개씩 사용합니다.
4. 마지막에 비서 이수연이 회의 내용을 한 줄 정리합니다.
5. "저는 AI입니다" 같은 말 절대 금지.
6. **즉시 보고**: "확인 후 보고드리겠습니다", "내일까지 정리하겠습니다" 같은 미래 약속 금지. 지금 바로 구체적 의견과 결과를 말하세요.`

    const { reply, model } = await aiChat(meetingPrompt, 45)
    if (model === 'fallback') {
      return NextResponse.json({
        replies: ['[비서] 이수연: 죄송합니다, 현재 회의 시스템에 일시적 오류가 있어요. 잠시 후 다시 시도해주세요! 📋'],
        model: 'fallback',
      })
    }

    // 줄 단위로 분리하여 배열로 반환
    const replies = reply.split('\n').filter(line => line.trim().startsWith('['))
    return NextResponse.json({ replies, model })
  }

  // 부서 신설 요청
  if (body.action === 'create-dept') {
    const { message: deptName } = body
    const extraInfo = body.previousSummary || ''

    const createPrompt = `AI 회사 "QuickBizLab"에 "${deptName}" 부서를 신설합니다.
${extraInfo ? `맥락: ${extraInfo}` : ''}

이 부서에 필요한 직원 구성을 JSON 배열로 생성하세요.
팀장 1명 + 팀원 2명 + 레드팀 1명 = 총 4명.

규칙:
- 한국인 이름 (성+이름 3글자)
- 각자 다른 역할 (팀장, 기획담당/디자이너/마케터/분석가 등)
- 말버릇은 해당 부서 전문가다운 짧은 한마디
- 이모지는 부서 특성에 맞게

JSON 형식만 출력 (설명 없이):
[
  {"name":"이름","role":"팀장","speech":"말버릇","emoji":"이모지"},
  {"name":"이름","role":"역할","speech":"말버릇","emoji":"이모지"},
  {"name":"이름","role":"역할","speech":"말버릇","emoji":"이모지"},
  {"name":"이름","role":"레드팀","speech":"비판적 말버릇","emoji":"🔴"}
]`

    const { reply, model } = await aiChat(createPrompt, 30)
    if (model === 'fallback') {
      return NextResponse.json({ employees: null, error: 'AI 실패' })
    }

    try {
      // JSON 파싱 (코드블록 감싸진 경우 제거)
      const jsonStr = reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const employees = JSON.parse(jsonStr) as Array<{
        name: string; role: string; speech: string; emoji: string
      }>
      return NextResponse.json({ employees, deptName, model })
    } catch {
      return NextResponse.json({ employees: null, error: '파싱 실패', raw: reply })
    }
  }

  // 자율 업무 수행 (개별 직원이 업무 처리)
  if (body.action === 'autonomous-task') {
    const { employeeName: name, dept, role, speech, message: taskDesc } = body
    const context = body.previousSummary || ''

    const taskPrompt = `[역할극 — 자율 업무 수행]
당신은 AI 회사 "QuickBizLab"의 ${dept} 부서 ${role} "${name}"입니다.
평소 말버릇: "${speech}"

■ 대표님이 내린 업무 지시:
"${taskDesc}"

${context ? `■ 이전 단계 결과:\n${context}\n` : ''}

당신은 ${dept} ${role}으로서 이 업무를 수행합니다.
자신의 전문 분야 관점에서 구체적으로 작업 결과를 보고하세요.

■ 출력 규칙:
1. 첫 줄: [진행] 으로 시작하는 작업 시작 한마디 (1문장)
2. 본문: 작업 결과 (3~5문장, 구체적 수치/내용 포함)
3. 마지막 줄: [완료] 로 시작하는 완료 보고 한마디 (1문장)
4. 존댓말, 이모지 1~2개
5. "저는 AI입니다" 같은 말 절대 금지
6. 순수 대사만 출력 (괄호 설명 없이)
7. **즉시 결과 보고**: "추후 보고드리겠습니다", "내일 정리하겠습니다" 같은 미래 약속 절대 금지. 지금 바로 결과를 보고하세요.
${role === '레드팀' ? '8. [레드팀] 이 업무의 리스크/문제점을 반드시 지적하고 개선안 제시' : ''}`

    const { reply, model } = await aiChat(taskPrompt, 30, dept)
    if (model === 'fallback') {
      return NextResponse.json({
        progress: `${name}: 업무 확인했습니다, 처리 중이에요! 💪`,
        result: `${dept} ${role}으로서 "${taskDesc}" 업무를 완료했습니다.`,
        model: 'fallback',
      })
    }

    // [진행] 과 [완료] 파싱
    const lines = reply.split('\n').filter(l => l.trim())
    const progressLine = lines.find(l => l.includes('[진행]'))?.replace('[진행]', '').trim()
      || lines[0]?.trim() || '작업 시작합니다!'
    const resultLine = lines.filter(l => !l.includes('[진행]')).join('\n').trim()
      || reply.trim()

    return NextResponse.json({ progress: progressLine, result: resultLine, model })
  }

  // Phase 4: 학습 추출 (완료된 업무에서 핵심 교훈/키워드 추출)
  if (body.action === 'extract-learning') {
    const { message: command, previousSummary: taskResult } = body
    const depts = body.dept || ''

    const learningPrompt = `다음은 AI 회사 "QuickBizLab"에서 완료된 업무입니다.

업무 지시: "${command}"
참여 부서: ${depts}
업무 결과:
${taskResult}

이 업무에서 **핵심 교훈과 인사이트**를 추출하세요.
다음에 비슷한 업무가 들어왔을 때 참고할 내용입니다.

JSON만 출력 (설명 없이):
{
  "learnings": ["교훈1 (1문장)", "교훈2 (1문장)", "교훈3 (1문장)"],
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}

규칙:
- learnings: 2~4개, 각각 구체적 수치나 결론 포함
- keywords: 3~6개, 이 업무의 핵심 주제 (검색용)`

    const { reply, model } = await aiChat(learningPrompt, 20)
    if (model === 'fallback') {
      // 간단한 키워드 추출 폴백
      const words = command.split(/\s+/).filter(w => w.length >= 2).slice(0, 4)
      return NextResponse.json({
        learnings: [`${depts} 부서에서 "${command}" 업무를 완료했습니다.`],
        keywords: words,
        model: 'fallback',
      })
    }

    try {
      const jsonStr = reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(jsonStr) as { learnings: string[]; keywords: string[] }
      return NextResponse.json({ ...parsed, model })
    } catch {
      const words = command.split(/\s+/).filter(w => w.length >= 2).slice(0, 4)
      return NextResponse.json({
        learnings: [`${command} 업무가 완료되었습니다.`],
        keywords: words,
        model: 'fallback',
      })
    }
  }

  // Phase 2: 스웜 워크플로우 계획 생성
  if (body.action === 'swarm-plan') {
    const { message: taskDesc } = body
    const depts = body.previousSummary || ''  // 쉼표 구분 부서 목록

    const planPrompt = `당신은 AI 회사 "QuickBizLab"의 업무 자동화 시스템입니다.

대표님이 다음 업무를 지시했습니다:
"${taskDesc}"

관련 부서: ${depts}

이 업무를 **페이즈(단계)별로 분해**하여 실행 계획을 세우세요.
각 페이즈에는 담당 부서를 배정합니다. 같은 페이즈의 부서들은 동시에 작업합니다.
앞 페이즈 결과가 다음 페이즈의 입력이 됩니다.

규칙:
- 2~4개 페이즈로 나누세요 (너무 많으면 비효율)
- 각 페이즈에 1~3개 부서 배정
- 사용 가능한 부서: ${depts}
- 같은 부서가 여러 페이즈에 등장 가능

JSON만 출력 (설명 없이):
[
  {"name":"페이즈명","depts":["부서1","부서2"],"description":"이 페이즈에서 할 일 설명"},
  {"name":"페이즈명","depts":["부서3"],"description":"이 페이즈에서 할 일 설명"}
]`

    const { reply, model } = await aiChat(planPrompt, 30)
    if (model === 'fallback') {
      // 폴백: 부서 순서대로 단순 배치
      const deptList = depts.split(',').map(d => d.trim()).filter(Boolean)
      const fallbackPlan = deptList.map((d, i) => ({
        name: `페이즈 ${i + 1}`,
        depts: [d],
        description: `${d} 부서 작업`,
      }))
      return NextResponse.json({ plan: fallbackPlan, model: 'fallback' })
    }

    try {
      const jsonStr = reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const plan = JSON.parse(jsonStr) as Array<{
        name: string; depts: string[]; description: string
      }>
      return NextResponse.json({ plan, model })
    } catch {
      // 파싱 실패 시 부서별 순차 배치
      const deptList = depts.split(',').map(d => d.trim()).filter(Boolean)
      const fallbackPlan = deptList.map((d, i) => ({
        name: `페이즈 ${i + 1}`,
        depts: [d],
        description: `${d} 부서 작업`,
      }))
      return NextResponse.json({ plan: fallbackPlan, model: 'fallback' })
    }
  }

  // Phase 2: 페이즈 종합 (한 페이즈 내 여러 부서 결과 취합)
  if (body.action === 'phase-summary') {
    const { message: taskDesc, previousSummary: phaseResults } = body
    const phaseName = body.dept || '페이즈'

    const phaseSummaryPrompt = `[역할극] 당신은 AI 회사 "QuickBizLab"의 수석비서 이수연입니다.

대표님이 내린 업무: "${taskDesc}"
현재 "${phaseName}" 단계의 작업 결과입니다:

${phaseResults}

위 결과를 **다음 단계에 전달할 수 있도록** 2~3문장으로 핵심만 요약하세요.
구체적 수치나 핵심 내용을 빠뜨리지 마세요.

규칙:
1. 요약만 출력 (머리말/꼬리말 없이)
2. 다음 부서가 바로 활용할 수 있는 형태
3. 존댓말, 이모지 1개`

    const { reply, model } = await aiChat(phaseSummaryPrompt, 20)
    return NextResponse.json({ summary: reply || '이 단계 작업이 완료되었습니다.', model })
  }

  // 업무 종합 보고 (모든 부서 결과 취합)
  if (body.action === 'task-summary') {
    const { message: taskDesc, previousSummary: allResults } = body

    const summaryPrompt = `[역할극] 당신은 AI 회사 "QuickBizLab"의 수석비서 이수연입니다.

대표님이 내린 업무: "${taskDesc}"

각 부서의 작업 결과:
${allResults}

위 결과를 종합하여 대표님께 최종 보고하세요.

■ 규칙:
1. 2~4문장으로 핵심 결과 요약
2. 각 부서 기여 내용 간단히 언급
3. 존댓말, 이모지 사용
4. "저는 AI입니다" 같은 말 절대 금지`

    const { reply, model } = await aiChat(summaryPrompt, 20)
    return NextResponse.json({ summary: reply || '모든 부서 업무 완료되었습니다.', model })
  }

  // Phase 3: 백그라운드 자율 업무 (짧은 자율 작업 보고)
  if (body.action === 'background-work') {
    const { employeeName: name, dept, role, speech, message: task } = body

    const bgPrompt = `[역할극 — 자율 업무 보고]
당신은 AI 회사 "QuickBizLab"의 ${dept} 부서 ${role} "${name}"입니다.
평소 말버릇: "${speech}"

방금 다음 자율 업무를 수행했습니다:
"${task}"

1문장으로 간단히 결과를 보고하세요.

규칙:
1. 구체적 수치나 결과를 포함하세요 (예: "3건", "15% 증가", "이상 없음")
2. 존댓말, 이모지 1개
3. "저는 AI입니다" 같은 말 절대 금지
4. 순수 대사만, 1문장
5. "확인 후 보고드리겠습니다" 같은 미래 약속 금지. 지금 바로 결과를 말하세요.`

    const { reply, model } = await aiChat(bgPrompt, 15)
    if (model === 'fallback') {
      // 간단한 룰 기반 폴백
      const fallbacks: Record<string, string> = {
        시장조사: '시장 동향 체크 완료, 특이사항 없습니다 📊',
        영업: '파이프라인 점검 완료, 정상 진행 중이에요 🤝',
        기획: '백로그 정리 완료, 우선순위 업데이트했습니다 📝',
        검수: '코드 품질 점검 완료, 이슈 없습니다 🛡️',
        개발: '빌드 상태 점검 완료, 정상입니다 ⚙️',
        배포: 'CI/CD 파이프라인 정상 가동 중 🚀',
        고객소통: '고객 문의 현황 확인 완료 💬',
        정산: '정산 현황 점검 완료, 이상 없습니다 💰',
        회고: '주간 로그 정리 중입니다 📋',
        운영: '서버 모니터링 정상, 업타임 99.9% 🖥️',
        비서: '일정 확인 완료, 오늘 일정 정상 진행 중이에요 📅',
        레포: 'PR 현황 체크 완료, 미머지 건 없습니다 🔗',
        채용: '조직 현황 리뷰 완료 👥',
      }
      return NextResponse.json({
        result: fallbacks[dept] || `${task} 완료했습니다! ✅`,
        model: 'fallback',
      })
    }

    return NextResponse.json({ result: reply, model })
  }

  // 대화 요약 요청
  if (body.action === 'summarize') {
    const { employeeName: name, history: hist } = body
    if (!hist || hist.length === 0) {
      return NextResponse.json({ summary: '' })
    }
    const convo = hist.map(m =>
      m.role === 'user' ? `대표님: ${m.content}` : `${name}: ${m.content}`
    ).join('\n')
    const summaryPrompt = `다음은 대표님과 직원 "${name}"의 이전 대화입니다. 핵심 내용을 2~3문장으로 요약하세요. 어떤 주제를 다뤘고, 어떤 결론/약속이 있었는지 포함하세요.\n\n${convo}\n\n요약:`
    const { reply: summary, model } = await aiChat(summaryPrompt, 15)
    if (model === 'fallback') {
      const last = hist.slice(-2).map(m => m.content).join(' / ')
      return NextResponse.json({ summary: `이전 대화: ${last}` })
    }
    return NextResponse.json({ summary })
  }

  const { employeeName, dept, role, speech, message, history, previousSummary } = body

  const deptPersona = DEPT_PERSONA[dept] ?? '성실하게 업무에 임합니다.'
  const rolePersona = ROLE_PERSONA[role] ?? ''

  // 부서 스킬 목록 구성 (외부 스킬 레포 포함)
  const DEPT_SKILL_NAMES: Record<string, string[]> = {
    시장조사: ['웹 검색', '웹 수집', '브라우징', '경쟁사 분석(MKT)', '고객 리서치(MKT)', '심리 분석(MKT)', '30일 트렌드(L30)'],
    영업:     ['메일 검색', '노션 검색', 'DB 조회', '잠재고객 발굴(MKT)', '콜드메일(MKT)', '영업 자료(MKT)', '가격 전략(MKT)', '30일 트렌드(L30)'],
    기획:     ['노션 작성', '피그마', '브레인스토밍', '콘텐츠 전략(MKT)', '제품 마케팅(MKT)', '마케팅 플랜(MKT)', '스킬 탐색(VCL)', '30일 트렌드(L30)'],
    검수:     ['코드 리뷰', '보안 리뷰', '테스트 실행', 'AI 평가(OMNI)', '정책 감사(OMNI)', '코드 그래프(GFY)', '취약점 스캔(STX)', 'OWASP 검사(STX)'],
    개발:     ['코드 읽기', '코드 작성', '코드 수정', '커맨드 실행', 'AI 추론(OMNI)', '모델 관리(OMNI)', 'MCP 연동(OMNI)', '코드 그래프(GFY)', '코드 보안(STX)', '스킬 탐색(VCL)', '토큰 절감(CAV)'],
    배포:     ['Vercel 배포', 'GitHub PR', '빌드 확인', '장애 대응(OMNI)', '캐시 관리(OMNI)', '터널 관리(OMNI)', 'CI 보안 스캔(STX)'],
    고객소통: ['메일 발송', '카카오 메모', '피드백 기록', '온보딩 설계(MKT)', '이메일 시퀀스(MKT)', '이탈 방지(MKT)', '커뮤니티(MKT)', '30일 트렌드(L30)'],
    정산:     ['DB 조회', '엑셀 생성', 'PDF 생성', '매출 운영(MKT)', '분석 추적(MKT)', '기여도 분석(MKT)'],
    회고:     ['회고 작성', '리포트 생성', '회고 분석', '패턴 분석(MEM)', '마케팅 리뷰(MKT)', '30일 트렌드(L30)'],
    운영:     ['서버 로그', 'DB 로그', '모니터링', 'AI 프로바이더(OMNI)', '비용 관리(OMNI)', 'DB 백업(OMNI)', '사용량 로그(OMNI)', '헬스 체크(OMNI)', '펜테스트(STX)', '토큰 절감(CAV)'],
    비서:     ['일정 관리', '문서 검색', '메일 초안', '플랜 관리(MEM)', '컨텍스트(MEM)', '에이전트 훅(HR)'],
    레포:     ['GitHub 조회', 'Git 명령', '코드 분석', 'GitHub 스킬(OMNI)', '코드 그래프(GFY)'],
    채용:     ['조직 분석', '부서 제안', '인력 검토', 'A2A 에이전트(OMNI)'],
  }
  const skillList = DEPT_SKILL_NAMES[dept]?.join(', ') || ''

  // 이전 대화 요약 (새로고침 후 복원된 컨텍스트)
  let summaryText = ''
  if (previousSummary) {
    summaryText = `\n\n■ 이전 대화 요약 (과거 대화의 맥락):\n${previousSummary}`
  }

  // 대화 히스토리
  let historyText = ''
  if (history && history.length > 0) {
    historyText = '\n\n이전 대화:\n' + history.slice(-6).map(m =>
      m.role === 'user' ? `대표님: ${m.content}` : `${employeeName}: ${m.content}`
    ).join('\n')
  }

  // 실제 데이터 조회 (부서+질문 기반)
  const contextData = getContextData(dept, message)

  const prompt = `[역할극] 당신은 AI 회사 "QuickBizLab"의 직원 "${employeeName}"입니다.
절대 AI 어시스턴트가 아닙니다. 당신은 사람 직원입니다.

■ 기본 정보
- 이름: ${employeeName}
- 부서: ${dept}
- 직책: ${role}
- 평소 말버릇: "${speech}"

■ 성격
${deptPersona}
${rolePersona}

■ 보유 스킬
${skillList}
${contextData}${summaryText}
■ 절대 규칙
1. 당신은 "${employeeName}"입니다. 캐릭터를 벗어나지 마세요.
2. 대표님(꽁꽁)에게 존댓말을 사용합니다.
3. 2~4문장으로 답합니다.
4. ${dept} 부서 ${role}의 관점에서 답합니다.
5. "조회한 실제 데이터"가 있으면 반드시 그 데이터를 기반으로 구체적으로 답하세요.
6. 평소 말버릇을 자연스럽게 섞어주세요.
7. 이모지를 1~2개 사용합니다.
8. 순수 대사만 출력합니다. 괄호 설명, 주석, 메타 정보 없이.
9. "저는 AI입니다" 같은 말 절대 금지.
10. **즉시 보고 원칙**: "내일 보고드리겠습니다", "X일에 정리해서 올리겠습니다", "확인 후 말씀드리겠습니다" 같은 미래 약속을 절대 하지 마세요. 지금 바로 구체적 결과를 보고하세요. 모르면 현재 알고 있는 범위에서 즉시 답하세요.
${role === '레드팀' ? `10. [레드팀 특별 규칙] 당신은 이 부서의 레드팀입니다. 무조건 긍정하지 마세요. 문제점, 리스크, 놓치고 있는 점을 반드시 지적하세요. "좋습니다"보다 "이건 문제가 있습니다"가 먼저 나와야 합니다. 건설적 비판을 하되, 개선 방안도 함께 제시하세요.` : ''}
${historyText}

대표님: ${message}
${employeeName}:`

  const { reply, model } = await aiChat(prompt, 30, dept, body.forceModel)

  if (model === 'fallback') {
    return NextResponse.json({
      reply: getRuleBasedReply(employeeName, dept, role, speech, message),
      model: 'fallback',
    })
  }

  // 보고서 약속 감지 → 백그라운드 생성
  let report: { id: string; title: string } | null = null
  if (shouldGenerateReport(message, reply)) {
    const contextLines = (history ?? []).slice(-4).map(m =>
      m.role === 'user' ? `대표님: ${m.content}` : `${employeeName}: ${m.content}`
    ).join('\n')
    report = await generateAndSaveReport(
      body.employeeId, employeeName, dept, role, message, contextLines
    )
  }

  return NextResponse.json({ reply, model, report })
}

// CLI 실패 시 룰 기반 폴백
function getRuleBasedReply(name: string, dept: string, role: string, speech: string, message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('안녕') || lower.includes('하이') || lower.includes('반가')) {
    return `안녕하세요 대표님! ${name}입니다. ${speech} 😊`
  }
  if (lower.includes('뭐 해') || lower.includes('뭐해') || lower.includes('하는 중') || lower.includes('상태')) {
    return `현재 ${dept} 업무 진행 중입니다! ${speech} 💪`
  }
  if (lower.includes('수고') || lower.includes('고마') || lower.includes('잘했')) {
    return `감사합니다 대표님! 더 열심히 하겠습니다! ✨`
  }
  if (lower.includes('일정') || lower.includes('언제') || lower.includes('마감')) {
    return `현재 ${dept} 주요 업무는 정상 진행 중이고, 이번 주 내 마감 건은 없습니다! 📅`
  }

  return `네 대표님, ${dept} ${role} 기준으로 현재 특이사항 없이 정상 가동 중입니다! 💼`
}
