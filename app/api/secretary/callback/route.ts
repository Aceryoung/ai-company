// app/api/secretary/callback/route.ts — Google OAuth 콜백 → refresh token 저장
import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import { join } from 'path'

const TOKEN_PATH = join(process.cwd(), '.google-calendar-token.json')

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return new NextResponse('Missing code', { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = 'http://localhost:3000/api/secretary/callback'

  // 코드를 토큰으로 교환
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await res.json()

  if (tokens.error) {
    return new NextResponse(`OAuth error: ${tokens.error_description || tokens.error}`, { status: 400 })
  }

  // refresh_token + access_token 저장
  writeFileSync(TOKEN_PATH, JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (tokens.expires_in as number) * 1000,
  }, null, 2))

  // 연동 완료 → 오피스로 리다이렉트
  return NextResponse.redirect('http://localhost:3000/office?calendar=connected')
}
