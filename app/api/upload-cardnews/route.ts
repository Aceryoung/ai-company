// 카드뉴스 이미지 업로드 → Supabase Storage + Notion 이미지 블록 추가
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const NOTION_TOKEN = process.env.NOTION_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const notionPageId = formData.get('notionPageId') as string
    const files = formData.getAll('images') as File[]

    if (!files.length) {
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })
    }

    const uploadedUrls: string[] = []
    const timestamp = Date.now()

    // 1. Supabase Storage 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileName = `${timestamp}_slide_${i + 1}.png`
      const arrayBuffer = await file.arrayBuffer()

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/cardnews/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'image/png',
            'x-upsert': 'true',
          },
          body: arrayBuffer,
        }
      )

      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        console.error(`[upload] slide ${i + 1} 실패:`, err)
        continue
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/cardnews/${fileName}`
      uploadedUrls.push(publicUrl)
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: '업로드 실패' }, { status: 500 })
    }

    // 2. Notion 페이지에 이미지 블록 추가
    let notionResult = null
    if (notionPageId && NOTION_TOKEN) {
      // 구분선 + 이미지 블록들
      const children: Array<Record<string, unknown>> = [
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: '📸 카드뉴스 이미지' } }],
          },
        },
      ]

      for (const url of uploadedUrls) {
        children.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: { url },
          },
        })
      }

      const notionRes = await fetch(
        `https://api.notion.com/v1/blocks/${notionPageId}/children`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ children }),
        }
      )

      if (notionRes.ok) {
        notionResult = await notionRes.json()
      } else {
        console.error('[notion] 이미지 블록 추가 실패:', await notionRes.text())
      }
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      notionUpdated: !!notionResult,
    })
  } catch (e) {
    console.error('[upload-cardnews]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
