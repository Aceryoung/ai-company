// app/api/employee-reports/route.ts — 보고서 목록/상세 조회 + Notion 동기화 마킹
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: '환경변수 누락' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const pending = searchParams.get('pending')

  // Notion 미동기화 보고서 조회
  if (pending === 'notion') {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/employee_reports?notion_synced=eq.false&select=id,employee_name,dept,title,content,created_at&order=created_at.desc`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const data = await res.json()
    return NextResponse.json(data)
  }

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

// Notion 동기화 완료 마킹
export async function PATCH(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: '환경변수 누락' }, { status: 500 })
  }

  const body = await req.json() as { ids: string[] }
  if (!body.ids?.length) {
    return NextResponse.json({ error: 'ids 필요' }, { status: 400 })
  }

  // 각 보고서를 notion_synced = true로 업데이트
  const results: string[] = []
  for (const id of body.ids) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/employee_reports?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ notion_synced: true }),
      }
    )
    if (res.ok) results.push(id)
  }

  return NextResponse.json({ synced: results.length, ids: results })
}
