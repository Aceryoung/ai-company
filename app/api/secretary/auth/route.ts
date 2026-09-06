// app/api/secretary/auth/route.ts — Google Calendar OAuth 시작
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not set' }, { status: 500 })
  }

  // GOOGLE_REFRESH_TOKEN이 이미 환경변수에 있으면 → 이미 연결됨
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    const baseUrl = req.nextUrl.origin
    return NextResponse.redirect(`${baseUrl}/office?calendar=connected`)
  }

  // 로컬 개발 시 OAuth 플로우
  const baseUrl = req.nextUrl.origin
  const redirectUri = `${baseUrl}/api/secretary/callback`
  const scope = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
