// app/api/content-image/route.tsx — 카드뉴스 슬라이드 → 1080x1350 PNG (4:5 인스타 캐러셀)
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 레이아웃 타입
type Layout = 'cover' | 'basic' | 'stats' | 'checklist' | 'comparison' | 'timeline' | 'table' | 'quote' | 'cta'

interface SlideItem {
  label: string
  value?: string
  checked?: boolean
  date?: string
}

interface Slide {
  title: string
  body?: string
  emoji?: string
  layout?: Layout
  items?: SlideItem[]
  bg?: string
  accent?: string
}

interface CardNewsData {
  brand?: string
  theme?: { primary: string; secondary: string; bg: string }
  slides: Slide[]
  hashtags?: string[]
}

const W = 1080
const H = 1350

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type: 'cardnews'
      slideIndex?: number
      data: CardNewsData
    }
    const { slideIndex, data } = body
    const slides = data.slides || []
    if (slides.length === 0) return new Response(JSON.stringify({ error: '슬라이드 없음' }), { status: 400 })

    if (slideIndex !== undefined) {
      const slide = slides[slideIndex]
      if (!slide) return new Response(JSON.stringify({ error: '인덱스 초과' }), { status: 400 })
      return renderSlide(slide, slideIndex, slides.length, data)
    }
    return new Response(JSON.stringify({ total: slides.length }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

// ── 색상 팔레트
function getColors(slide: Slide, index: number, data: CardNewsData) {
  const theme = data.theme || { primary: '#6366f1', secondary: '#8b5cf6', bg: '#0f172a' }
  const layout = slide.layout || 'basic'

  // 표지/CTA: 강렬한 그라데이션
  if (layout === 'cover' || layout === 'cta') {
    return { bg: `linear-gradient(145deg, ${theme.primary}, ${theme.secondary})`, text: '#ffffff', sub: 'rgba(255,255,255,0.8)', accent: '#ffffff', isLight: false }
  }
  // 인용: 다크
  if (layout === 'quote') {
    return { bg: theme.bg, text: '#ffffff', sub: 'rgba(255,255,255,0.7)', accent: theme.primary, isLight: false }
  }
  // 짝수: 라이트, 홀수: 다크 (변화)
  if (index % 2 === 0) {
    return { bg: '#ffffff', text: '#1e293b', sub: '#64748b', accent: theme.primary, isLight: true }
  }
  return { bg: theme.bg, text: '#f1f5f9', sub: '#94a3b8', accent: theme.primary, isLight: false }
}

// ── 공통 래퍼
function SlideWrapper({ children, colors, brand, index, total, hashtags }: {
  children: React.ReactNode; colors: ReturnType<typeof getColors>
  brand?: string; index: number; total: number; hashtags?: string[]
}) {
  const isLast = index === total - 1
  return (
    <div style={{
      width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column',
      background: colors.bg, padding: '60px 70px', position: 'relative', overflow: 'hidden',
    }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        {brand && <div style={{ fontSize: '22px', fontWeight: 700, color: colors.sub, display: 'flex' }}>{brand}</div>}
        <div style={{ fontSize: '20px', color: colors.sub, display: 'flex', marginLeft: 'auto' }}>{index + 1} / {total}</div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        {children}
      </div>

      {/* 해시태그 (마지막) */}
      {isLast && hashtags && hashtags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '30px', justifyContent: 'center' }}>
          {hashtags.map((tag, i) => (
            <span key={i} style={{ fontSize: '20px', color: colors.accent, display: 'flex' }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* 장식: 코너 액센트 라인 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '6px', height: '120px',
        background: colors.accent, display: 'flex',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: 0, width: '120px', height: '6px',
        background: colors.accent, display: 'flex',
      }} />
    </div>
  )
}

// ── 레이아웃 렌더러들

function CoverLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      {slide.emoji && <div style={{ fontSize: '80px', marginBottom: '30px', display: 'flex' }}>{slide.emoji}</div>}
      <div style={{ fontSize: '54px', fontWeight: 900, color: colors.text, lineHeight: 1.3, marginBottom: '20px', display: 'flex', maxWidth: '900px' }}>
        {slide.title}
      </div>
      {slide.body && (
        <div style={{ fontSize: '28px', color: colors.sub, lineHeight: 1.5, display: 'flex', maxWidth: '800px' }}>
          {slide.body}
        </div>
      )}
    </div>
  )
}

function BasicLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {slide.emoji && <div style={{ fontSize: '56px', marginBottom: '20px', display: 'flex' }}>{slide.emoji}</div>}
      <div style={{ fontSize: '44px', fontWeight: 800, color: colors.text, lineHeight: 1.3, marginBottom: '24px', display: 'flex' }}>
        {slide.title}
      </div>
      <div style={{ width: '80px', height: '4px', background: colors.accent, marginBottom: '24px', display: 'flex' }} />
      {slide.body && (
        <div style={{ fontSize: '28px', color: colors.sub, lineHeight: 1.7, display: 'flex' }}>
          {slide.body}
        </div>
      )}
    </div>
  )
}

function StatsLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  const items = slide.items || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '40px', fontWeight: 800, color: colors.text, marginBottom: '40px', display: 'flex' }}>
        {slide.emoji || '📊'} {slide.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: colors.isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '32px 40px', minWidth: '200px', flex: '1',
          }}>
            <div style={{ fontSize: '52px', fontWeight: 900, color: colors.accent, display: 'flex', marginBottom: '8px' }}>
              {item.value || '0'}
            </div>
            <div style={{ fontSize: '22px', color: colors.sub, display: 'flex' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChecklistLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  const items = slide.items || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '40px', fontWeight: 800, color: colors.text, marginBottom: '36px', display: 'flex' }}>
        {slide.emoji || '✅'} {slide.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: colors.isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)',
            borderRadius: '14px', padding: '20px 28px',
            borderLeft: `4px solid ${item.checked !== false ? colors.accent : '#94a3b8'}`,
          }}>
            <div style={{ fontSize: '28px', display: 'flex' }}>
              {item.checked !== false ? '✅' : '⬜'}
            </div>
            <div style={{ fontSize: '26px', color: colors.text, display: 'flex', flex: 1 }}>{item.label}</div>
            {item.value && <div style={{ fontSize: '22px', color: colors.accent, fontWeight: 700, display: 'flex' }}>{item.value}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  const items = slide.items || []
  const left = items.filter((_, i) => i % 2 === 0)
  const right = items.filter((_, i) => i % 2 === 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '40px', fontWeight: 800, color: colors.text, marginBottom: '36px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
        {slide.emoji || '⚔️'} {slide.title}
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* 왼쪽 */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: '14px',
          background: colors.isLight ? '#eff6ff' : 'rgba(99,102,241,0.15)',
          borderRadius: '16px', padding: '28px',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: colors.accent, marginBottom: '8px', display: 'flex' }}>
            {left[0]?.value || 'A'}
          </div>
          {left.map((item, i) => (
            <div key={i} style={{ fontSize: '22px', color: colors.text, display: 'flex' }}>• {item.label}</div>
          ))}
        </div>
        {/* VS */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '36px', fontWeight: 900, color: colors.accent }}>VS</div>
        {/* 오른쪽 */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: '14px',
          background: colors.isLight ? '#fef2f2' : 'rgba(239,68,68,0.15)',
          borderRadius: '16px', padding: '28px',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginBottom: '8px', display: 'flex' }}>
            {right[0]?.value || 'B'}
          </div>
          {right.map((item, i) => (
            <div key={i} style={{ fontSize: '22px', color: colors.text, display: 'flex' }}>• {item.label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  const items = slide.items || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '40px', fontWeight: 800, color: colors.text, marginBottom: '36px', display: 'flex' }}>
        {slide.emoji || '📅'} {slide.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', paddingLeft: '40px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '24px', position: 'relative', paddingBottom: '28px' }}>
            {/* 세로 라인 */}
            {i < items.length - 1 && (
              <div style={{
                position: 'absolute', left: '-28px', top: '18px', width: '3px', height: '100%',
                background: colors.isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)', display: 'flex',
              }} />
            )}
            {/* 포인트 */}
            <div style={{
              position: 'absolute', left: '-36px', top: '8px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: colors.accent, display: 'flex',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {item.date && <div style={{ fontSize: '20px', color: colors.accent, fontWeight: 700, marginBottom: '4px', display: 'flex' }}>{item.date}</div>}
              <div style={{ fontSize: '26px', color: colors.text, fontWeight: 600, display: 'flex' }}>{item.label}</div>
              {item.value && <div style={{ fontSize: '22px', color: colors.sub, display: 'flex', marginTop: '4px' }}>{item.value}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TableLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  const items = slide.items || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '40px', fontWeight: 800, color: colors.text, marginBottom: '30px', display: 'flex' }}>
        {slide.emoji || '📋'} {slide.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', border: `2px solid ${colors.isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}` }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 28px',
            background: i === 0
              ? colors.accent
              : i % 2 === 0
              ? (colors.isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)')
              : 'transparent',
          }}>
            <div style={{
              fontSize: i === 0 ? '22px' : '24px',
              fontWeight: i === 0 ? 800 : 500,
              color: i === 0 ? '#ffffff' : colors.text,
              display: 'flex',
            }}>{item.label}</div>
            {item.value && (
              <div style={{
                fontSize: i === 0 ? '22px' : '24px',
                fontWeight: i === 0 ? 800 : 700,
                color: i === 0 ? '#ffffff' : colors.accent,
                display: 'flex',
              }}>{item.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function QuoteLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '100px', color: colors.accent, lineHeight: 1, marginBottom: '10px', display: 'flex' }}>"</div>
      <div style={{ fontSize: '36px', fontWeight: 700, color: colors.text, lineHeight: 1.6, maxWidth: '800px', display: 'flex' }}>
        {slide.title}
      </div>
      {slide.body && (
        <div style={{ fontSize: '24px', color: colors.sub, marginTop: '24px', display: 'flex' }}>— {slide.body}</div>
      )}
    </div>
  )
}

function CtaLayout({ slide, colors }: { slide: Slide; colors: ReturnType<typeof getColors> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      {slide.emoji && <div style={{ fontSize: '72px', marginBottom: '24px', display: 'flex' }}>{slide.emoji}</div>}
      <div style={{ fontSize: '48px', fontWeight: 900, color: colors.text, lineHeight: 1.4, marginBottom: '20px', display: 'flex', maxWidth: '800px' }}>
        {slide.title}
      </div>
      {slide.body && (
        <div style={{ fontSize: '28px', color: colors.sub, marginBottom: '40px', display: 'flex' }}>{slide.body}</div>
      )}
      {/* CTA 버튼 */}
      <div style={{
        display: 'flex', background: '#ffffff', color: colors.accent || '#6366f1',
        fontSize: '28px', fontWeight: 800, padding: '20px 60px', borderRadius: '50px',
      }}>
        {slide.items?.[0]?.label || '자세히 보기 →'}
      </div>
    </div>
  )
}

// ── 메인 렌더러
function renderSlide(slide: Slide, index: number, total: number, data: CardNewsData) {
  const colors = getColors(slide, index, data)
  const layout = slide.layout || (index === 0 ? 'cover' : index === total - 1 ? 'cta' : 'basic')

  const layoutMap: Record<string, React.ReactElement> = {
    cover: <CoverLayout slide={slide} colors={colors} />,
    basic: <BasicLayout slide={slide} colors={colors} />,
    stats: <StatsLayout slide={slide} colors={colors} />,
    checklist: <ChecklistLayout slide={slide} colors={colors} />,
    comparison: <ComparisonLayout slide={slide} colors={colors} />,
    timeline: <TimelineLayout slide={slide} colors={colors} />,
    table: <TableLayout slide={slide} colors={colors} />,
    quote: <QuoteLayout slide={slide} colors={colors} />,
    cta: <CtaLayout slide={slide} colors={colors} />,
  }

  const content = layoutMap[layout] || layoutMap.basic

  return new ImageResponse(
    <SlideWrapper colors={colors} brand={data.brand} index={index} total={total} hashtags={data.hashtags}>
      {content}
    </SlideWrapper>,
    { width: W, height: H },
  )
}

// GET: 테스트
export async function GET() {
  return renderSlide(
    { title: 'QuickBizLab', body: '7종 레이아웃 카드뉴스', emoji: '🚀', layout: 'cover' },
    0, 3, { brand: 'QuickBizLab', slides: [], hashtags: ['AI', '자동화'] }
  )
}
