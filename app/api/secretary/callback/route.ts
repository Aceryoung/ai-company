// app/api/secretary/callback/route.ts — Google OAuth 콜백
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return new NextResponse('Missing code', { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const baseUrl = req.nextUrl.origin
  const redirectUri = `${baseUrl}/api/secretary/callback`

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

  // Vercel에서는 파일 저장 불가 → refresh_token을 화면에 표시
  // 사용자가 이 값을 Vercel 환경변수 GOOGLE_REFRESH_TOKEN에 추가해야 함
  if (tokens.refresh_token) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto">
        <h2>✅ Google 연결 성공!</h2>
        <p>아래 Refresh Token을 Vercel 환경변수 <code>GOOGLE_REFRESH_TOKEN</code>에 추가하세요:</p>
        <textarea readonly style="width:100%;height:80px;font-size:12px;padding:8px">${tokens.refresh_token}</textarea>
        <p style="margin-top:20px"><a href="${baseUrl}/office?calendar=connected">← 오피스로 돌아가기</a></p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  return NextResponse.redirect(`${baseUrl}/office?calendar=connected`)
}
