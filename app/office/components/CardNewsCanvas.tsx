'use client'

import { useRef, useCallback, useEffect } from 'react'
import './cardnews.css'

export type CardTemplate = 'clean' | 'black' | 'mag' | 'news' | 'edit' | 'pop'
export type CardLayout = 'cover' | 'list' | 'quote' | 'stat' | 'table' | 'photo' | 'outro'
export type CardRatio = '1:1' | '4:5'

export interface CardItem {
  head: string
  body: string
}

export interface CardSlide {
  layout: CardLayout
  kicker?: string
  title: string
  sub?: string
  items?: CardItem[]
  quote?: string
  number?: string
  desc?: string
  cta?: string
  imageUrl?: string
}

export interface CardDeck {
  brand?: string
  tags?: string
  slides: CardSlide[]
}

const TEMPLATES: { id: CardTemplate; name: string }[] = [
  { id: 'clean', name: '클린' },
  { id: 'black', name: '블랙 임팩트' },
  { id: 'mag', name: '매거진 포토' },
  { id: 'news', name: '뉴스레터' },
  { id: 'edit', name: '에디토리얼' },
  { id: 'pop', name: '팝 비비드' },
]

export { TEMPLATES as CARD_TEMPLATES }

function pad2(n: number) { return String(n).padStart(2, '0') }

function mdToHtml(s: string | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<em class="hl" style="font-style:normal;color:var(--c-hl)">$1</em>')
    .replace(/\n/g, '<br>')
}

function renderCardHTML(card: CardSlide, i: number, n: number, deck: CardDeck, tpl: CardTemplate, ratio: CardRatio): string {
  let main = ''
  const F = (text: string | undefined, cls: string) => {
    if (!text?.trim()) return ''
    return `<div class="${cls}">${mdToHtml(text)}</div>`
  }

  switch (card.layout) {
    case 'cover':
      main = F(card.kicker, 'c-kicker') + '<i class="c-deco"></i>' + F(card.title, 'c-title') + F(card.sub, 'c-sub')
      break
    case 'list':
      main = '<i class="c-deco"></i>' + F(card.title, 'c-title') + '<div class="c-items">' +
        (card.items || []).map((it, j) =>
          `<div class="c-item"><div class="c-no">${pad2(j + 1)}</div><div class="c-it">${F(it.head, 'c-ih')}${F(it.body, 'c-ib')}</div></div>`
        ).join('') + '</div>'
      break
    case 'quote':
      main = '<div class="c-qm">&ldquo;</div>' + F(card.quote, 'c-quote') + F(card.title, 'c-title')
      break
    case 'stat':
      main = '<i class="c-deco"></i>' + F(card.title, 'c-title') + F(card.number, 'c-number') + F(card.desc, 'c-desc')
      break
    case 'table':
      main = '<i class="c-deco"></i>' + F(card.title, 'c-title') + '<div class="c-table">' +
        (card.items || []).map(it =>
          `<div class="c-td">${mdToHtml(it.head)}</div><div class="c-td">${mdToHtml(it.body)}</div>`
        ).join('') + '</div>'
      break
    case 'photo':
      main = F(card.title, 'c-title') + F(card.sub, 'c-sub')
      break
    default: // outro
      main = '<i class="c-deco"></i>' + F(card.title, 'c-title') + F(card.sub, 'c-sub') +
        F(card.cta, 'c-cta') +
        (i === n - 1 && deck.tags ? `<div class="c-tags">${mdToHtml(deck.tags)}</div>` : '')
  }

  const hasPhoto = !!card.imageUrl
  const photoStyle = hasPhoto ? ` style="background-image:url('${card.imageUrl}')"` : ''

  return `<div class="cn-card t-${tpl} l-${card.layout}${ratio === '4:5' ? ' r-45' : ''}${hasPhoto ? ' has-photo' : ''}">` +
    `<div class="c-photo"${photoStyle}></div>` +
    '<div class="c-shade"></div>' +
    '<div class="c-body"><div class="c-top">' +
    `<div class="c-page">${i + 1} / ${n}</div></div>` +
    `<div class="c-main">${main}</div></div>` +
    `<div class="c-brand">${mdToHtml(deck.brand || 'QuickBizLab')}</div>` +
    '</div>'
}

interface Props {
  deck: CardDeck
  template: CardTemplate
  ratio: CardRatio
  onTemplateChange?: (t: CardTemplate) => void
}

export function CardNewsCanvas({ deck, template, ratio, onTemplateChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const frames = containerRef.current.querySelectorAll<HTMLElement>('.cn-frame')
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        ;(e.target as HTMLElement).style.setProperty('--s', String(e.contentRect.width / 1080))
      }
    })
    frames.forEach(f => ro.observe(f))
    return () => ro.disconnect()
  }, [deck.slides.length, template, ratio])

  return (
    <div>
      {onTemplateChange && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => onTemplateChange(t.id)}
              className={`text-xs px-2 py-1 rounded transition ${
                template === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1a2a3f] text-[#6b8cbb] hover:bg-[#243a55]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div ref={containerRef} className="grid grid-cols-2 gap-2">
        {deck.slides.map((slide, i) => (
          <div key={i} className={`cn-frame${ratio === '4:5' ? ' r-45' : ''}`}>
            <div dangerouslySetInnerHTML={{ __html: renderCardHTML(slide, i, deck.slides.length, deck, template, ratio) }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export async function captureAllCards(
  deck: CardDeck,
  template: CardTemplate,
  ratio: CardRatio
): Promise<Blob[]> {
  const html2canvas = (await import('html2canvas')).default
  const blobs: Blob[] = []
  const H = ratio === '4:5' ? 1350 : 1080

  const host = document.createElement('div')
  host.className = 'cn-shot-host'
  document.body.appendChild(host)

  try {
    for (let i = 0; i < deck.slides.length; i++) {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = renderCardHTML(deck.slides[i], i, deck.slides.length, deck, template, ratio)
      const card = wrapper.firstElementChild as HTMLElement
      host.innerHTML = ''
      host.appendChild(card)

      if (document.fonts?.ready) await document.fonts.ready
      await new Promise(r => setTimeout(r, 50))

      const canvas = await html2canvas(card, {
        width: 1080,
        height: H,
        scale: 1,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('blob failed')), 'image/jpeg', 0.85)
      )
      blobs.push(blob)
    }
  } finally {
    host.remove()
  }

  return blobs
}
