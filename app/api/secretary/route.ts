// app/api/secretary/route.ts — 개인비서 API (Vercel 호환 — fetch 기반)
import { NextRequest, NextResponse } from 'next/server'

// ── Google OAuth 토큰 (메모리 캐시 — employee-chat과 공유 불가하므로 별도 관리)
let cachedAccessToken: string | null = null
let tokenExpiresAt = 0

async function getCalendarToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json() as { access_token?: string; expires_in?: number; error?: string }
    if (data.error || !data.access_token) return null

    cachedAccessToken = data.access_token
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000
    return cachedAccessToken
  } catch { return null }
}

// ── GitHub 주간 정리 (fetch 기반)
async function getWeeklySummary(user = 'Aceryoung') {
  const repos = ['Aceryoung/familyproject', 'Aceryoung/sentence-collector']
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const ghToken = process.env.GITHUB_TOKEN || ''
  const headers: Record<string, string> = ghToken
    ? { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' }
    : { Accept: 'application/vnd.github+json' }

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
    let commits: Array<{ sha: string; message: string; date: string }> = []
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/commits?author=${user}&since=${since}T00:00:00Z&per_page=50`,
        { headers, signal: AbortSignal.timeout(10_000) }
      )
      if (res.ok) {
        const parsed = await res.json() as Array<Record<string, unknown>>
        commits = parsed.map(c => ({
          sha: (c.sha as string).slice(0, 7),
          message: ((c.commit as Record<string, unknown> & { message: string }).message || '').split('\n')[0],
          date: (c.commit as Record<string, unknown> & { author: { date: string } }).author.date,
        }))
      }
    } catch { /* ignore */ }

    let prsCreated: Array<{ number: number; title: string; state: string; url: string }> = []
    let prsMerged: Array<{ number: number; title: string; mergedAt: string }> = []
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=20`,
        { headers, signal: AbortSignal.timeout(10_000) }
      )
      if (res.ok) {
        const parsed = await res.json() as Array<Record<string, unknown>>
        const weekPrs = parsed.filter(p => new Date(p.created_at as string) >= new Date(`${since}T00:00:00Z`))
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
      }
    } catch { /* ignore */ }

    let issuesClosed: Array<{ number: number; title: string }> = []
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues?state=closed&since=${since}T00:00:00Z&per_page=20`,
        { headers, signal: AbortSignal.timeout(10_000) }
      )
      if (res.ok) {
        const parsed = await res.json() as Array<Record<string, unknown>>
        issuesClosed = parsed
          .filter(i => !i.pull_request)
          .map(i => ({ number: i.number as number, title: i.title as string }))
      }
    } catch { /* ignore */ }

    summary.repos.push({ name: repo.split('/')[1], commits, prsCreated, prsMerged, issuesClosed })
    summary.totals.commits += commits.length
    summary.totals.prsCreated += prsCreated.length
    summary.totals.prsMerged += prsMerged.length
    summary.totals.issuesClosed += issuesClosed.length
  }

  return summary
}

// KST 기준 날짜 (Vercel은 UTC)
function getKSTDate(offsetDays = 0): { timeMin: string; timeMax: string } {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth(), d = kst.getUTCDate()
  const timeMin = new Date(Date.UTC(y, m, d, -9, 0, 0)).toISOString()
  const timeMax = new Date(Date.UTC(y, m, d, 14, 59, 59)).toISOString()
  return { timeMin, timeMax }
}

// ── 오늘 일정
async function getTodaySchedule() {
  const token = await getCalendarToken()
  if (!token) return { events: [], error: 'Google Calendar 연동 필요 — 설정에서 연결해주세요' }

  const { timeMin, timeMax } = getKSTDate(0)

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&timeZone=Asia/Seoul`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }
    )
    const data = await res.json() as { items?: Array<Record<string, unknown>> }
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
async function getTomorrowSchedule() {
  const token = await getCalendarToken()
  if (!token) return { events: [], error: 'Google Calendar 연동 필요' }

  const { timeMin, timeMax } = getKSTDate(1)

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&timeZone=Asia/Seoul`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }
    )
    const data = await res.json() as { items?: Array<Record<string, unknown>> }
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

  switch (action) {
    case 'weekly':
      return NextResponse.json(await getWeeklySummary())

    case 'today':
      return NextResponse.json(await getTodaySchedule())

    case 'tomorrow':
      return NextResponse.json(await getTomorrowSchedule())

    case 'briefing': {
      const [schedule, weekly] = await Promise.all([getTodaySchedule(), getWeeklySummary()])
      return NextResponse.json({ schedule, weekly, generatedAt: new Date().toISOString() })
    }

    case 'status': {
      const token = await getCalendarToken()
      return NextResponse.json({ connected: token !== null })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
