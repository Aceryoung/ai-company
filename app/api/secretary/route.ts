// app/api/secretary/route.ts — 개인비서 API (GitHub 주간정리 + Google Calendar)
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const TOKEN_PATH = join(process.cwd(), '.google-calendar-token.json')

function run(cmd: string, timeoutSec = 15): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: timeoutSec * 1000 }).trim()
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string }
    return `ERROR: ${err.stderr?.slice(0, 200) || err.message?.slice(0, 200) || 'unknown'}`
  }
}

// ── Google Calendar 토큰 관리
function getCalendarToken(): string | null {
  if (!existsSync(TOKEN_PATH)) return null

  try {
    const stored = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) as {
      access_token: string
      refresh_token: string
      expires_at: number
    }

    // 만료 5분 전이면 리프레시
    if (Date.now() > stored.expires_at - 5 * 60 * 1000) {
      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET
      if (!clientId || !clientSecret || !stored.refresh_token) return null

      const result = run(
        `curl -s -X POST "https://oauth2.googleapis.com/token" -d "client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${stored.refresh_token}&grant_type=refresh_token"`,
        10
      )
      const tokens = JSON.parse(result) as { access_token?: string; expires_in?: number; error?: string }
      if (tokens.error || !tokens.access_token) return null

      stored.access_token = tokens.access_token
      stored.expires_at = Date.now() + (tokens.expires_in || 3600) * 1000
      writeFileSync(TOKEN_PATH, JSON.stringify(stored, null, 2))
    }

    return stored.access_token
  } catch {
    return null
  }
}

// ── GitHub 주간 정리
function getWeeklySummary(user = 'Aceryoung') {
  const repos = ['Aceryoung/familyproject', 'Aceryoung/sentence-collector']
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const summary: {
    period: string
    repos: Array<{
      name: string
      commits: Array<{ sha: string; message: string; date: string }>
      prsCreated: Array<{ number: number; title: string; state: string; url: string }>
      prsMerged: Array<{ number: number; title: string; mergedAt: string }>
      issuesClosed: Array<{ number: number; title: string }>
    }>
    totals: { commits: number; prsCreated: number; prsMerged: number; issuesClosed: number }
  } = {
    period: `${since} ~ ${new Date().toISOString().split('T')[0]}`,
    repos: [],
    totals: { commits: 0, prsCreated: 0, prsMerged: 0, issuesClosed: 0 },
  }

  for (const repo of repos) {
    // 커밋 목록
    const commitsRaw = run(`gh api "repos/${repo}/commits?author=${user}&since=${since}T00:00:00Z&per_page=50" 2>/dev/null`)
    let commits: Array<{ sha: string; message: string; date: string }> = []
    try {
      const parsed = JSON.parse(commitsRaw) as Array<Record<string, unknown>>
      commits = parsed.map(c => ({
        sha: (c.sha as string).slice(0, 7),
        message: ((c.commit as Record<string, unknown> & { message: string }).message || '').split('\n')[0],
        date: (c.commit as Record<string, unknown> & { author: { date: string } }).author.date,
      }))
    } catch { /* ignore */ }

    // PR 생성
    const prsRaw = run(`gh api "repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=20" 2>/dev/null`)
    let prsCreated: Array<{ number: number; title: string; state: string; url: string }> = []
    let prsMerged: Array<{ number: number; title: string; mergedAt: string }> = []
    try {
      const parsed = JSON.parse(prsRaw) as Array<Record<string, unknown>>
      const weekPrs = parsed.filter(p => {
        const created = new Date(p.created_at as string)
        return created >= new Date(`${since}T00:00:00Z`)
      })
      prsCreated = weekPrs.map(p => ({
        number: p.number as number,
        title: p.title as string,
        state: p.state as string,
        url: p.html_url as string,
      }))
      prsMerged = weekPrs
        .filter(p => p.merged_at)
        .map(p => ({
          number: p.number as number,
          title: p.title as string,
          mergedAt: p.merged_at as string,
        }))
    } catch { /* ignore */ }

    // 이슈 닫힌 것
    const issuesRaw = run(`gh api "repos/${repo}/issues?state=closed&since=${since}T00:00:00Z&per_page=20" 2>/dev/null`)
    let issuesClosed: Array<{ number: number; title: string }> = []
    try {
      const parsed = JSON.parse(issuesRaw) as Array<Record<string, unknown>>
      issuesClosed = parsed
        .filter(i => !i.pull_request) // PR 제외
        .map(i => ({
          number: i.number as number,
          title: i.title as string,
        }))
    } catch { /* ignore */ }

    summary.repos.push({
      name: repo.split('/')[1],
      commits,
      prsCreated,
      prsMerged,
      issuesClosed,
    })

    summary.totals.commits += commits.length
    summary.totals.prsCreated += prsCreated.length
    summary.totals.prsMerged += prsMerged.length
    summary.totals.issuesClosed += issuesClosed.length
  }

  return summary
}

// ── 오늘 일정 (Google Calendar — OAuth 연동 후 활성화)
function getTodaySchedule(accessToken?: string) {
  if (!accessToken) {
    return { events: [], error: 'Google Calendar 연동 필요 — 설정에서 연결해주세요' }
  }

  // Google Calendar API 호출
  const today = new Date()
  const timeMin = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const timeMax = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  try {
    const result = run(
      `curl -s -H "Authorization: Bearer ${accessToken}" "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime"`,
      10
    )
    const data = JSON.parse(result) as { items?: Array<Record<string, unknown>> }
    const events = (data.items || []).map(e => ({
      title: e.summary as string,
      start: (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date,
      end: (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date,
      location: e.location as string | undefined,
    }))
    return { events }
  } catch (e: unknown) {
    return { events: [], error: `캘린더 조회 실패: ${(e as { message?: string }).message?.slice(0, 100)}` }
  }
}

// ── 내일 일정
function getTomorrowSchedule(accessToken?: string) {
  if (!accessToken) {
    return { events: [], error: 'Google Calendar 연동 필요' }
  }

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const timeMin = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString()
  const timeMax = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString()

  try {
    const result = run(
      `curl -s -H "Authorization: Bearer ${accessToken}" "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime"`,
      10
    )
    const data = JSON.parse(result) as { items?: Array<Record<string, unknown>> }
    const events = (data.items || []).map(e => ({
      title: e.summary as string,
      start: (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date,
      end: (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date,
      location: e.location as string | undefined,
    }))
    return { events }
  } catch (e: unknown) {
    return { events: [], error: `캘린더 조회 실패: ${(e as { message?: string }).message?.slice(0, 100)}` }
  }
}

// ── API 핸들러
export async function POST(req: NextRequest) {
  const { action } = await req.json()
  const token = getCalendarToken()

  switch (action) {
    case 'weekly':
      return NextResponse.json(getWeeklySummary())

    case 'today':
      return NextResponse.json(getTodaySchedule(token ?? undefined))

    case 'tomorrow':
      return NextResponse.json(getTomorrowSchedule(token ?? undefined))

    case 'briefing': {
      const schedule = getTodaySchedule(token ?? undefined)
      const weekly = getWeeklySummary()
      return NextResponse.json({
        schedule,
        weekly,
        generatedAt: new Date().toISOString(),
      })
    }

    case 'status':
      return NextResponse.json({ connected: token !== null })

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
