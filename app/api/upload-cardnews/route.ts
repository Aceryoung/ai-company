// 카드뉴스 이미지 업로드 → Supabase Storage + Notion 이미지 블록 + Uplika SNS 발행
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const NOTION_TOKEN = process.env.NOTION_API_KEY!
const UPLIKA_API_KEY = process.env.UPLIKA_API_KEY
const UPLIKA_BASE = 'https://api.uplika.com'

interface UplikaAccount {
  id: string
  platform: string
  handle: string
  status: string
}

async function uplikaFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${UPLIKA_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${UPLIKA_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  })
}

async function getUplikaAccounts(): Promise<UplikaAccount[]> {
  if (!UPLIKA_API_KEY) return []
  try {
    const res = await uplikaFetch('/v1/accounts')
    if (!res.ok) return []
    const data = await res.json() as { data?: UplikaAccount[] }
    return (data.data || []).filter(a => a.status === 'active')
  } catch {
    return []
  }
}

async function uplikaMediaFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await uplikaFetch('/v1/media/from-url', {
      method: 'POST',
      body: JSON.stringify({ url: imageUrl }),
    })
    if (!res.ok) {
      console.error('[uplika] media_from_url failed:', await res.text())
      return null
    }
    const data = await res.json() as { data?: { id?: string } }
    return data.data?.id || null
  } catch (e) {
    console.error('[uplika] media_from_url error:', e)
    return null
  }
}

interface PublishOptions {
  accountIds: string[]
  content: string
  mediaIds: string[]
  scheduledAt?: string
  hashtags?: string[]
  instagram?: {
    content?: string
  }
}

async function uplikaPublish(options: PublishOptions): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      accountIds: options.accountIds,
      content: options.content,
      mediaIds: options.mediaIds,
      wait: true,
    }
    if (options.scheduledAt) body.scheduledAt = options.scheduledAt
    if (options.instagram) body.options = { instagram: options.instagram }

    const res = await uplikaFetch('/v1/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const data = await res.json() as { data?: { id?: string }; error?: { code?: string; message?: string } }
    if (!res.ok) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` }
    }
    return { success: true, postId: data.data?.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const notionPageId = formData.get('notionPageId') as string
    const files = formData.getAll('images') as File[]
    const publishToSns = formData.get('publishToSns') === 'true'
    const snsCaption = formData.get('snsCaption') as string || ''
    const snsScheduledAt = formData.get('snsScheduledAt') as string || ''
    const snsHashtags = formData.get('snsHashtags') as string || ''

    if (!files.length) {
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })
    }

    const uploadedUrls: string[] = []
    const timestamp = Date.now()

    // 1. Supabase Storage 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? 'jpg' : 'png'
      const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png'
      const fileName = `${timestamp}_slide_${i + 1}.${ext}`
      const arrayBuffer = await file.arrayBuffer()

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/cardnews/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': mime,
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

    // 3. Uplika SNS 발행
    let snsResult: { success: boolean; postId?: string; error?: string; accounts?: string[] } | null = null
    if (publishToSns && UPLIKA_API_KEY) {
      const accounts = await getUplikaAccounts()
      if (accounts.length === 0) {
        snsResult = { success: false, error: 'Uplika 연결된 채널 없음' }
      } else {
        // 이미지 URL → Uplika 미디어 등록
        const mediaIds: string[] = []
        for (const url of uploadedUrls) {
          const mediaId = await uplikaMediaFromUrl(url)
          if (mediaId) mediaIds.push(mediaId)
        }

        if (mediaIds.length === 0) {
          snsResult = { success: false, error: '미디어 등록 실패' }
        } else {
          const hashtags = snsHashtags ? snsHashtags.split(',').map(t => t.trim()).filter(Boolean) : []
          const caption = snsCaption + (hashtags.length ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '')

          const accountIds = accounts.map(a => a.id)
          const result = await uplikaPublish({
            accountIds,
            content: caption,
            mediaIds,
            scheduledAt: snsScheduledAt || undefined,
            instagram: { content: caption.slice(0, 2200) },
          })

          snsResult = {
            ...result,
            accounts: accounts.map(a => `${a.platform}:${a.handle}`),
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      notionUpdated: !!notionResult,
      sns: snsResult,
    })
  } catch (e) {
    console.error('[upload-cardnews]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
