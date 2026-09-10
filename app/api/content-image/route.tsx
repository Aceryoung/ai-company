// app/api/content-image/route.tsx — 카드뉴스/뉴스레터를 PNG 이미지로 변환
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 슬라이드 데이터 타입
interface Slide {
  title: string
  body: string
  emoji?: string
  bg?: string       // 배경색
  accent?: string   // 강조색
}

interface CardNewsData {
  brand?: string
  slides: Slide[]
  hashtags?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type: 'cardnews' | 'newsletter'
      slideIndex?: number  // 특정 슬라이드만 (없으면 전체)
      data: CardNewsData
    }

    const { type, slideIndex, data } = body

    if (type === 'cardnews') {
      const slides = data.slides || []
      if (slides.length === 0) {
        return new Response(JSON.stringify({ error: '슬라이드 없음' }), { status: 400 })
      }

      // 특정 슬라이드만 요청
      if (slideIndex !== undefined) {
        const slide = slides[slideIndex]
        if (!slide) {
          return new Response(JSON.stringify({ error: '슬라이드 인덱스 초과' }), { status: 400 })
        }
        return renderCardSlide(slide, slideIndex, slides.length, data.brand, data.hashtags)
      }

      // 전체 슬라이드 URL 목록 반환 (클라이언트가 개별 요청)
      return new Response(JSON.stringify({
        total: slides.length,
        message: 'slideIndex 파라미터로 개별 슬라이드 요청하세요 (0부터)',
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: '지원하지 않는 타입' }), { status: 400 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

function renderCardSlide(
  slide: Slide, index: number, total: number,
  brand?: string, hashtags?: string[]
) {
  const bg = slide.bg || (index === 0 ? '#6366f1' : '#f8fafc')
  const isLight = bg === '#f8fafc' || bg === '#ffffff' || bg === '#fff'
  const textColor = isLight ? '#1e293b' : '#ffffff'
  const subColor = isLight ? '#64748b' : 'rgba(255,255,255,0.85)'
  const accent = slide.accent || '#6366f1'
  const isFirst = index === 0
  const isLast = index === total - 1

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: isFirst
            ? `linear-gradient(135deg, ${accent}, #8b5cf6)`
            : isLast
            ? `linear-gradient(135deg, ${accent}, #ec4899)`
            : bg,
          padding: '80px',
          fontFamily: '"Noto Sans KR", sans-serif',
          position: 'relative',
        }}
      >
        {/* 브랜드 로고 */}
        {brand && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '60px',
              fontSize: '24px',
              color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              display: 'flex',
            }}
          >
            {brand}
          </div>
        )}

        {/* 페이지 번호 */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '60px',
            fontSize: '22px',
            color: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.5)',
            display: 'flex',
          }}
        >
          {index + 1} / {total}
        </div>

        {/* 이모지 */}
        {slide.emoji && (
          <div style={{ fontSize: '72px', marginBottom: '24px', display: 'flex' }}>
            {slide.emoji}
          </div>
        )}

        {/* 제목 */}
        <div
          style={{
            fontSize: isFirst ? '56px' : '48px',
            fontWeight: 900,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.3,
            marginBottom: '24px',
            display: 'flex',
            maxWidth: '900px',
          }}
        >
          {slide.title}
        </div>

        {/* 본문 */}
        <div
          style={{
            fontSize: '32px',
            color: subColor,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {slide.body}
        </div>

        {/* 해시태그 (마지막 슬라이드) */}
        {isLast && hashtags && hashtags.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '60px',
              fontSize: '22px',
              color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.6)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              maxWidth: '900px',
              justifyContent: 'center',
            }}
          >
            {hashtags.map(tag => `#${tag}`).join('  ')}
          </div>
        )}
      </div>
    ),
    { width: 1080, height: 1080 },
  )
}

// GET: 간단한 테스트용
export async function GET() {
  return renderCardSlide(
    { title: 'QuickBizLab', body: '카드뉴스 이미지 생성 테스트', emoji: '🚀' },
    0, 1, 'QuickBizLab'
  )
}
