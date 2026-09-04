// app/api/employee-reports/route.ts — 보고서 목록/상세 조회
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: '환경변수 누락' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  // 단건 조회
  if (id) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/employee_reports?id=eq.${id}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const data = await res.json() as Array<Record<string, unknown>>
    if (!data[0]) return NextResponse.json({ error: '보고서 없음' }, { status: 404 })
    return NextResponse.json(data[0])
  }

  // 목록 (최근 20건)
  const res = await fetch(
    `${supabaseUrl}/rest/v1/employee_reports?select=id,employee_name,dept,title,created_at&order=created_at.desc&limit=20`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const data = await res.json()
  return NextResponse.json(data)
}
