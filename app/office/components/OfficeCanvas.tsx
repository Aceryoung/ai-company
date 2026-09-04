// components/OfficeCanvas.tsx — 픽셀 게임 스타일 사무실 (Canvas 2D) v2
'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useOfficeStore, type EmployeeState } from '../store/officeStore'
import { EMPLOYEES, STATUS_COLORS, DEPT_COLORS } from '../data/employees'

// ── 상수
const TILE = 36
const COLS = 28
const ROWS = 22
const CANVAS_W = COLS * TILE
const CANVAS_H = ROWS * TILE
const FPS = 12

// ── 스프라이트 색상 팔레트
const SKIN_TONES = ['#fdd', '#fcc', '#ecc', '#fdb', '#fdc', '#edd', '#fcd', '#ecb']
const HAIR_COLORS = ['#321', '#543', '#654', '#876', '#432', '#765', '#234', '#445', '#553', '#222', '#644', '#433']

// 캐릭터 특성 (직원 인덱스별)
interface CharTraits {
  hairStyle: 'short' | 'long' | 'ponytail' | 'bob' | 'spiky' | 'bun'
  skinTone: string
  accessory: 'none' | 'glasses' | 'tie' | 'headset' | 'hat' | 'earring'
  isFemale: boolean
}

// 29명 각각의 외형 (이름 기반 성별 + 역할 기반 악세서리)
const CHAR_TRAITS: CharTraits[] = [
  // 시장조사: 박서준(M), 정유진(F)
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'glasses', isFemale: false },
  { hairStyle: 'long', skinTone: SKIN_TONES[1], accessory: 'earring', isFemale: true },
  // 영업: 한미래(F), 최수빈(F), 임하늘(M)
  { hairStyle: 'bob', skinTone: SKIN_TONES[2], accessory: 'earring', isFemale: true },
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[3], accessory: 'none', isFemale: true },
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'tie', isFemale: false },
  // 기획: 김도현(M), 이서아(F), 남지호(M)
  { hairStyle: 'spiky', skinTone: SKIN_TONES[4], accessory: 'glasses', isFemale: false },
  { hairStyle: 'long', skinTone: SKIN_TONES[5], accessory: 'earring', isFemale: true },
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'none', isFemale: false },
  // 검수: 장하윤(F), 백현우(M)
  { hairStyle: 'bun', skinTone: SKIN_TONES[6], accessory: 'glasses', isFemale: true },
  { hairStyle: 'short', skinTone: SKIN_TONES[7], accessory: 'glasses', isFemale: false },
  // 개발: 권민준(M), 조예린(F), 서준혁(M), 윤다은(F)
  { hairStyle: 'spiky', skinTone: SKIN_TONES[0], accessory: 'headset', isFemale: false },
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[1], accessory: 'none', isFemale: true },
  { hairStyle: 'short', skinTone: SKIN_TONES[2], accessory: 'glasses', isFemale: false },
  { hairStyle: 'bob', skinTone: SKIN_TONES[3], accessory: 'headset', isFemale: true },
  // 배포: 신예준(M), 안소율(F)
  { hairStyle: 'short', skinTone: SKIN_TONES[4], accessory: 'hat', isFemale: false },
  { hairStyle: 'long', skinTone: SKIN_TONES[5], accessory: 'none', isFemale: true },
  // 고객소통: 문지아(F), 김서윤(F)
  { hairStyle: 'bob', skinTone: SKIN_TONES[6], accessory: 'headset', isFemale: true },
  { hairStyle: 'long', skinTone: SKIN_TONES[7], accessory: 'headset', isFemale: true },
  // 정산: 오재민(M), 유하영(F)
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'tie', isFemale: false },
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[1], accessory: 'glasses', isFemale: true },
  // 회고: 황채은(F), 송민규(M)
  { hairStyle: 'bun', skinTone: SKIN_TONES[2], accessory: 'earring', isFemale: true },
  { hairStyle: 'spiky', skinTone: SKIN_TONES[3], accessory: 'none', isFemale: false },
  // 운영: 강태오(M), 노은지(F)
  { hairStyle: 'short', skinTone: SKIN_TONES[4], accessory: 'glasses', isFemale: false },
  { hairStyle: 'long', skinTone: SKIN_TONES[5], accessory: 'earring', isFemale: true },
  // 비서: 이수연(F), 차민서(F)
  { hairStyle: 'bob', skinTone: SKIN_TONES[6], accessory: 'earring', isFemale: true },
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[7], accessory: 'none', isFemale: true },
  // 레포: 고은채(F), 배지훈(M), 한소희(F)
  { hairStyle: 'long', skinTone: SKIN_TONES[0], accessory: 'glasses', isFemale: true },
  { hairStyle: 'short', skinTone: SKIN_TONES[1], accessory: 'none', isFemale: false },
  { hairStyle: 'bun', skinTone: SKIN_TONES[2], accessory: 'earring', isFemale: true },
]

// ── 부서 구역 정의
interface DeptZone {
  dept: string
  label: string
  x: number; y: number
  w: number; h: number
  floor: string
  floorAlt: string
  borderColor: string
}

const DEPT_ZONES: DeptZone[] = [
  // 상단 좌측: 시장조사 + 영업
  { dept: '시장조사', label: '🔍 시장조사', x: 1, y: 1, w: 6, h: 4, floor: '#f0e8dd', floorAlt: '#e8e0d5', borderColor: '#cc4444' },
  { dept: '영업', label: '🤝 영업', x: 8, y: 1, w: 6, h: 4, floor: '#f0e8dd', floorAlt: '#e8e0d5', borderColor: '#cc7722' },
  // 상단 우측: 기획 + 검수
  { dept: '기획', label: '📝 기획', x: 15, y: 1, w: 6, h: 4, floor: '#eee8d8', floorAlt: '#e6e0d0', borderColor: '#bb9922' },
  { dept: '검수', label: '🛡️ 검수', x: 22, y: 1, w: 5, h: 4, floor: '#eee8d8', floorAlt: '#e6e0d0', borderColor: '#44aa55' },
  // 중단 좌측: 개발
  { dept: '개발', label: '💻 개발', x: 1, y: 6, w: 10, h: 4, floor: '#e8e8f0', floorAlt: '#e0e0e8', borderColor: '#3388cc' },
  // 중단 우측: 배포 + 운영
  { dept: '배포', label: '🚀 배포', x: 12, y: 6, w: 5, h: 4, floor: '#ece6f0', floorAlt: '#e4dee8', borderColor: '#7755bb' },
  { dept: '운영', label: '🔒 운영', x: 18, y: 6, w: 5, h: 4, floor: '#e8e8e8', floorAlt: '#e0e0e0', borderColor: '#666677' },
  // 하단: 고객소통 + 정산 + 회고
  { dept: '고객소통', label: '💬 고객소통', x: 1, y: 11, w: 5, h: 4, floor: '#f0e6f0', floorAlt: '#e8dee8', borderColor: '#bb66cc' },
  { dept: '정산', label: '💰 정산', x: 7, y: 11, w: 5, h: 4, floor: '#e6f0ec', floorAlt: '#dee8e4', borderColor: '#22aa77' },
  { dept: '회고', label: '📈 회고', x: 13, y: 11, w: 5, h: 4, floor: '#f0ece6', floorAlt: '#e8e4de', borderColor: '#cc6622' },
  // 하단 우측: 비서 + 레포
  { dept: '비서', label: '📌 비서', x: 19, y: 11, w: 4, h: 4, floor: '#e6ecf4', floorAlt: '#dee4ec', borderColor: '#3388dd' },
  { dept: '레포', label: '🔗 레포', x: 1, y: 16, w: 8, h: 4, floor: '#e6ecf4', floorAlt: '#dee4ec', borderColor: '#5588cc' },
  // 대표실
  { dept: 'CEO', label: '👑 대표실', x: 24, y: 6, w: 3, h: 4, floor: '#f0e8d0', floorAlt: '#e8e0c8', borderColor: '#cc8800' },
  // 회의실
  { dept: '회의실', label: '🏢 회의실', x: 10, y: 16, w: 6, h: 4, floor: '#e0e8f0', floorAlt: '#d8e0e8', borderColor: '#557799' },
]

// ── 좌석 위치 (부서별 배치)
function seatPosition(idx: number): { x: number; y: number } {
  const seats = [
    // 시장조사 (2명)
    { x: 2, y: 3 }, { x: 4, y: 3 },
    // 영업 (3명)
    { x: 9, y: 3 }, { x: 11, y: 3 }, { x: 13, y: 3 },
    // 기획 (3명)
    { x: 16, y: 3 }, { x: 18, y: 3 }, { x: 20, y: 3 },
    // 검수 (2명)
    { x: 23, y: 3 }, { x: 25, y: 3 },
    // 개발 (4명)
    { x: 2, y: 8 }, { x: 4, y: 8 }, { x: 6, y: 8 }, { x: 8, y: 8 },
    // 배포 (2명)
    { x: 13, y: 8 }, { x: 15, y: 8 },
    // 고객소통 (2명)
    { x: 2, y: 13 }, { x: 4, y: 13 },
    // 정산 (2명)
    { x: 8, y: 13 }, { x: 10, y: 13 },
    // 회고 (2명)
    { x: 14, y: 13 }, { x: 16, y: 13 },
    // 운영 (2명)
    { x: 19, y: 8 }, { x: 21, y: 8 },
    // 비서 (2명)
    { x: 20, y: 13 }, { x: 22, y: 13 },
    // 레포 (3명)
    { x: 2, y: 18 }, { x: 4, y: 18 }, { x: 6, y: 18 },
  ]
  return seats[idx] ?? { x: 2 + (idx % 12), y: 3 + Math.floor(idx / 12) * 5 }
}

// ── 타일 렌더
function drawFloorTile(ctx: CanvasRenderingContext2D, px: number, py: number, color: string, alt: string, x: number, y: number) {
  ctx.fillStyle = (x + y) % 2 === 0 ? color : alt
  ctx.fillRect(px, py, TILE, TILE)
  // 미세 텍스처
  ctx.fillStyle = 'rgba(255,255,255,0.02)'
  if ((x * 7 + y * 3) % 5 === 0) ctx.fillRect(px + 12, py + 14, 2, 2)
}

function drawWall(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#b8a88c'
  ctx.fillRect(px, py, TILE, TILE)
  ctx.fillStyle = '#c8b89c'
  ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2)
  ctx.fillStyle = '#b8a88c'
  ctx.fillRect(px, py + TILE / 2 - 1, TILE, 1)
}

function drawWindowWall(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#b8a88c'
  ctx.fillRect(px, py, TILE, TILE)
  // 창문 프레임
  ctx.fillStyle = '#e8e0d0'
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8)
  // 하늘
  ctx.fillStyle = '#88ccee'
  ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12)
  // 구름/하이라이트
  ctx.fillStyle = '#aaddff'
  ctx.fillRect(px + 8, py + 8, 8, 4)
  ctx.fillStyle = '#bbddff'
  ctx.fillRect(px + 18, py + 12, 6, 3)
}

// ── 가구 렌더
function drawDesk(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 책상 상판 (나무색)
  ctx.fillStyle = '#8b6e4e'
  ctx.fillRect(px + 2, py + 4, TILE - 4, TILE / 2)
  ctx.fillStyle = '#a0825e'
  ctx.fillRect(px + 3, py + 5, TILE - 6, TILE / 2 - 2)
  // 나무결 디테일
  ctx.fillStyle = '#967256'
  ctx.fillRect(px + 6, py + 7, TILE - 12, 1)
  ctx.fillRect(px + 8, py + 10, TILE - 16, 1)
  // 모니터
  ctx.fillStyle = '#222'
  ctx.fillRect(px + 10, py + 0, 16, 12)
  ctx.fillStyle = frame % 24 < 20 ? '#4488bb' : '#3377aa'
  ctx.fillRect(px + 11, py + 1, 14, 10)
  // 화면 내용 (코드줄 느낌)
  if (frame % 24 < 20) {
    ctx.fillStyle = '#66aadd'
    ctx.fillRect(px + 13, py + 3, 8, 1)
    ctx.fillRect(px + 13, py + 5, 10, 1)
    ctx.fillRect(px + 13, py + 7, 6, 1)
  }
  // 모니터 스탠드
  ctx.fillStyle = '#333'
  ctx.fillRect(px + 16, py + 12, 4, 3)
  // 키보드 (흰색)
  ctx.fillStyle = '#ddd'
  ctx.fillRect(px + 8, py + TILE / 2, 14, 4)
  ctx.fillStyle = '#ccc'
  ctx.fillRect(px + 9, py + TILE / 2 + 1, 12, 2)
}

function drawBookshelf(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#6b5035'
  ctx.fillRect(px + 4, py + 2, TILE - 8, TILE - 4)
  ctx.fillStyle = '#7a6045'
  ctx.fillRect(px + 5, py + 3, TILE - 10, TILE - 6)
  // 책들
  const bookColors = ['#c44', '#44c', '#4a4', '#ca4', '#a4c']
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bookColors[i % bookColors.length]
    ctx.fillRect(px + 7 + i * 5, py + 5, 4, 10)
  }
  // 선반
  ctx.fillStyle = '#3a2a1a'
  ctx.fillRect(px + 5, py + 16, TILE - 10, 2)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = bookColors[(i + 2) % bookColors.length]
    ctx.fillRect(px + 8 + i * 6, py + 19, 5, 8)
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 화분 (테라코타)
  ctx.fillStyle = '#b06030'
  ctx.fillRect(px + 10, py + 20, 16, 12)
  ctx.fillStyle = '#c07040'
  ctx.fillRect(px + 12, py + 18, 12, 4)
  // 잎 (흔들림)
  const sway = Math.sin(frame * 0.05) * 1
  ctx.fillStyle = '#3aaa44'
  ctx.fillRect(px + 10 + sway, py + 6, 8, 14)
  ctx.fillRect(px + 18 - sway, py + 8, 8, 12)
  ctx.fillStyle = '#55cc55'
  ctx.fillRect(px + 12 + sway, py + 2, 10, 10)
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#ddd'
  ctx.fillRect(px + 10, py + 6, 16, 26)
  ctx.fillStyle = '#eee'
  ctx.fillRect(px + 12, py + 8, 12, 8)
  ctx.fillStyle = '#4af'
  ctx.fillRect(px + 12, py + 10, 12, 4)
  ctx.fillStyle = '#f44'
  ctx.fillRect(px + 12, py + 20, 5, 4)
  ctx.fillStyle = '#4af'
  ctx.fillRect(px + 19, py + 20, 5, 4)
}

function drawMeetingTable(ctx: CanvasRenderingContext2D, px: number, py: number, w: number, h: number) {
  ctx.fillStyle = '#7a5d3a'
  ctx.fillRect(px, py, w, h)
  ctx.fillStyle = '#8a6d4a'
  ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
  // 의자들
  ctx.fillStyle = '#555'
  for (let i = 0; i < Math.floor(w / 20); i++) {
    ctx.fillRect(px + 8 + i * 20, py - 8, 10, 8) // 위
    ctx.fillRect(px + 8 + i * 20, py + h, 10, 8)  // 아래
  }
}

// ── 캐릭터 스프라이트
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  deptColor: string,
  status: string,
  frame: number,
  empIdx: number,
  isHovered: boolean,
  name: string,
  emoji: string,
) {
  const traits = CHAR_TRAITS[empIdx] ?? CHAR_TRAITS[0]
  const hairColor = HAIR_COLORS[empIdx % HAIR_COLORS.length]
  const skin = traits.skinTone
  const bounce = Math.sin(frame * 0.3 + empIdx) * (status === 'work' ? 1.5 : 0.5)

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(px + TILE / 2, py + TILE - 4, 9, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  const cy = py + bounce

  // ── 다리 + 신발
  if (traits.isFemale) {
    // 치마/스커트 느낌 → 짧은 다리
    ctx.fillStyle = deptColor
    ctx.fillRect(px + 10, cy + 26, 16, 3) // 치마 끝단
    ctx.fillStyle = skin
    ctx.fillRect(px + 12, cy + 29, 4, 3)
    ctx.fillRect(px + 20, cy + 29, 4, 3)
    // 구두
    ctx.fillStyle = '#444'
    ctx.fillRect(px + 11, cy + 31, 6, 2)
    ctx.fillRect(px + 19, cy + 31, 6, 2)
  } else {
    // 바지
    ctx.fillStyle = '#2a2a44'
    ctx.fillRect(px + 12, cy + 26, 5, 6)
    ctx.fillRect(px + 19, cy + 26, 5, 6)
    // 신발
    ctx.fillStyle = '#333'
    ctx.fillRect(px + 11, cy + 31, 7, 2)
    ctx.fillRect(px + 18, cy + 31, 7, 2)
  }

  // ── 몸통 (셔츠/블라우스)
  ctx.fillStyle = deptColor
  ctx.fillRect(px + 9, cy + 16, 18, 12)
  // 옷 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(px + 10, cy + 17, 5, 6)
  // 옷깃/칼라 (흰색)
  ctx.fillStyle = '#fff'
  ctx.fillRect(px + 14, cy + 16, 8, 2)

  // ── 넥타이
  if (traits.accessory === 'tie') {
    ctx.fillStyle = '#cc2244'
    ctx.fillRect(px + 17, cy + 18, 3, 8)
    ctx.fillRect(px + 16, cy + 18, 5, 2) // 매듭
  }

  // ── 팔
  ctx.fillStyle = deptColor
  ctx.fillRect(px + 5, cy + 17, 5, 9)
  ctx.fillRect(px + 26, cy + 17, 5, 9)
  // 손
  ctx.fillStyle = skin
  ctx.fillRect(px + 5, cy + 25, 5, 3)
  ctx.fillRect(px + 26, cy + 25, 5, 3)

  // ── 머리 (얼굴)
  ctx.fillStyle = skin
  ctx.fillRect(px + 10, cy + 4, 16, 14)
  // 볼 터치 (블러셔)
  ctx.fillStyle = 'rgba(255,130,130,0.25)'
  ctx.fillRect(px + 10, cy + 13, 4, 3)
  ctx.fillRect(px + 22, cy + 13, 4, 3)

  // ── 머리카락 (스타일별)
  ctx.fillStyle = hairColor
  switch (traits.hairStyle) {
    case 'short':
      ctx.fillRect(px + 9, cy + 2, 18, 6)
      ctx.fillRect(px + 8, cy + 4, 3, 4)
      ctx.fillRect(px + 25, cy + 4, 3, 4)
      break
    case 'long':
      ctx.fillRect(px + 8, cy + 2, 20, 7)
      ctx.fillRect(px + 7, cy + 4, 4, 14) // 왼쪽 긴 머리
      ctx.fillRect(px + 25, cy + 4, 4, 14) // 오른쪽 긴 머리
      // 머리 끝 디테일
      ctx.fillStyle = hairColor + '88'
      ctx.fillRect(px + 7, cy + 16, 4, 4)
      ctx.fillRect(px + 25, cy + 16, 4, 4)
      ctx.fillStyle = hairColor
      break
    case 'ponytail':
      ctx.fillRect(px + 9, cy + 2, 18, 6)
      ctx.fillRect(px + 8, cy + 4, 3, 4)
      // 포니테일
      ctx.fillRect(px + 25, cy + 3, 4, 4)
      ctx.fillRect(px + 27, cy + 5, 3, 10)
      ctx.fillRect(px + 28, cy + 14, 2, 4)
      break
    case 'bob':
      ctx.fillRect(px + 8, cy + 2, 20, 7)
      ctx.fillRect(px + 7, cy + 4, 4, 10) // 양쪽 단발
      ctx.fillRect(px + 25, cy + 4, 4, 10)
      break
    case 'spiky':
      ctx.fillRect(px + 9, cy + 3, 18, 5)
      // 뾰족 머리
      ctx.fillRect(px + 10, cy + 0, 3, 4)
      ctx.fillRect(px + 15, cy + -1, 3, 5)
      ctx.fillRect(px + 20, cy + 0, 3, 4)
      ctx.fillRect(px + 8, cy + 4, 3, 4)
      ctx.fillRect(px + 25, cy + 4, 3, 4)
      break
    case 'bun':
      ctx.fillRect(px + 9, cy + 2, 18, 6)
      ctx.fillRect(px + 8, cy + 4, 3, 4)
      ctx.fillRect(px + 25, cy + 4, 3, 4)
      // 올림머리 (뒤쪽 볼륨)
      ctx.fillRect(px + 13, cy + -2, 10, 5)
      ctx.fillRect(px + 15, cy + -3, 6, 3)
      break
  }

  // ── 눈
  if (status === 'work') {
    // 집중 눈 — 일자
    ctx.fillStyle = '#222'
    ctx.fillRect(px + 13, cy + 10, 2, 3)
    ctx.fillRect(px + 21, cy + 10, 2, 3)
  } else if (status === 'link') {
    ctx.fillStyle = '#bf5af2'
    ctx.fillRect(px + 13, cy + 10, 3, 2)
    ctx.fillRect(px + 21, cy + 10, 3, 2)
  } else if (status === 'done') {
    // 행복한 눈 ^_^
    ctx.fillStyle = '#222'
    ctx.fillRect(px + 12, cy + 10, 4, 1)
    ctx.fillRect(px + 12, cy + 9, 1, 2)
    ctx.fillRect(px + 15, cy + 9, 1, 2)
    ctx.fillRect(px + 20, cy + 10, 4, 1)
    ctx.fillRect(px + 20, cy + 9, 1, 2)
    ctx.fillRect(px + 23, cy + 9, 1, 2)
  } else {
    // 일반 눈 (흰자 + 동자)
    ctx.fillStyle = '#fff'
    ctx.fillRect(px + 12, cy + 9, 5, 4)
    ctx.fillRect(px + 20, cy + 9, 5, 4)
    ctx.fillStyle = '#222'
    ctx.fillRect(px + 14, cy + 10, 3, 3)
    ctx.fillRect(px + 22, cy + 10, 3, 3)
    // 눈 하이라이트
    ctx.fillStyle = '#fff'
    ctx.fillRect(px + 14, cy + 10, 1, 1)
    ctx.fillRect(px + 22, cy + 10, 1, 1)
  }

  // ── 안경
  if (traits.accessory === 'glasses') {
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1
    ctx.strokeRect(px + 11, cy + 8, 6, 5)
    ctx.strokeRect(px + 19, cy + 8, 6, 5)
    // 브릿지
    ctx.fillStyle = '#444'
    ctx.fillRect(px + 17, cy + 10, 2, 1)
  }

  // ── 헤드셋
  if (traits.accessory === 'headset') {
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px + 18, cy + 5, 12, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
    // 이어피스
    ctx.fillStyle = '#444'
    ctx.fillRect(px + 6, cy + 8, 4, 6)
    ctx.fillRect(px + 26, cy + 8, 4, 6)
    // 마이크
    ctx.fillStyle = '#555'
    ctx.fillRect(px + 5, cy + 14, 5, 2)
    ctx.fillRect(px + 4, cy + 15, 3, 4)
  }

  // ── 모자 (배포팀장)
  if (traits.accessory === 'hat') {
    ctx.fillStyle = '#3355aa'
    ctx.fillRect(px + 7, cy + 0, 22, 4)
    ctx.fillRect(px + 10, cy + -3, 16, 4)
    // 챙
    ctx.fillStyle = '#2244aa'
    ctx.fillRect(px + 6, cy + 3, 24, 2)
  }

  // ── 귀걸이
  if (traits.accessory === 'earring') {
    ctx.fillStyle = '#ffcc44'
    ctx.fillRect(px + 8, cy + 12, 2, 3)
    ctx.fillRect(px + 26, cy + 12, 2, 3)
  }

  // ── 입
  if (status === 'done') {
    // 웃는 입
    ctx.fillStyle = '#e66'
    ctx.fillRect(px + 14, cy + 15, 8, 1)
    ctx.fillRect(px + 15, cy + 16, 6, 1)
  } else if (status === 'work') {
    // 진지한 입
    ctx.fillStyle = '#c88'
    ctx.fillRect(px + 15, cy + 15, 6, 1)
  } else {
    // 미소
    ctx.fillStyle = '#d88'
    ctx.fillRect(px + 14, cy + 15, 8, 1)
    ctx.fillRect(px + 15, cy + 16, 6, 1)
  }

  // ── 상태 이모지 (머리 위)
  const statusEmoji: Record<string, string> = {
    idle: '💤', work: '💻', done: '✅', boss: '📢', link: '🔗'
  }
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(statusEmoji[status] ?? '💤', px + TILE / 2, cy + 1)
  ctx.textAlign = 'left'

  // 작업중 펄스 이펙트
  if (status === 'work' && frame % 16 < 8) {
    ctx.strokeStyle = 'rgba(0,200,0,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(px + TILE / 2, cy - 2, 7, 0, Math.PI * 2)
    ctx.stroke()
  }

  // ★ 이름 표시 (캐릭터 아래)
  ctx.font = 'bold 9px "Pretendard", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(60,50,40,0.8)'
  const nameW = ctx.measureText(name).width + 8
  ctx.beginPath()
  ctx.roundRect(px + TILE / 2 - nameW / 2, py + TILE - 1, nameW, 13, 3)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(name, px + TILE / 2, py + TILE + 9)
  ctx.textAlign = 'left'

  // 호버 시 강조
  if (isHovered) {
    ctx.strokeStyle = '#ff8800'
    ctx.lineWidth = 2
    ctx.strokeRect(px + 3, cy + 0, TILE - 6, TILE - 2)
  }
}

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const animRef = useRef<number>(0)
  const [hoveredEmp, setHoveredEmp] = useState<string | null>(null)
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null)
  const [scale, setScale] = useState(1)

  const empStates = useOfficeStore((s) => s.empStates)
  const setEmpBubble = useOfficeStore((s) => s.setEmpBubble)
  const tickEmpBubbles = useOfficeStore((s) => s.tickEmpBubbles)
  const addLog = useOfficeStore((s) => s.addLog)

  // 초기 직원 좌석 배치
  useEffect(() => {
    for (let i = 0; i < EMPLOYEES.length; i++) {
      const emp = EMPLOYEES[i]
      const seat = seatPosition(i)
      const st = useOfficeStore.getState().empStates[emp.id]
      if (!st || (st.x === 0 && st.y === 0)) {
        useOfficeStore.setState((s) => ({
          empStates: {
            ...s.empStates,
            [emp.id]: {
              status: st?.status ?? 'idle',
              bubble: st?.bubble ?? '',
              bubbleTimer: st?.bubbleTimer ?? 0,
              x: seat.x, y: seat.y,
              tx: seat.x, ty: seat.y,
              walking: false,
            },
          },
        }))
      }
    }
  }, [])

  // 반응형
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const h = entry.contentRect.height
      setScale(Math.min(w / CANVAS_W, h / CANVAS_H, 1.5))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── 렌더 루프
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const states = useOfficeStore.getState().empStates
    const frame = frameRef.current++

    // 전체 배경 (밝은 회색)
    ctx.fillStyle = '#c8c0b4'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 외벽 (창문)
    for (let x = 0; x < COLS; x++) {
      drawWindowWall(ctx, x * TILE, 0)
      drawWall(ctx, x * TILE, (ROWS - 1) * TILE)
    }
    for (let y = 0; y < ROWS; y++) {
      drawWall(ctx, 0, y * TILE)
      drawWall(ctx, (COLS - 1) * TILE, y * TILE)
    }

    // 복도 바닥 (밝은 타일)
    for (let x = 1; x < COLS - 1; x++) {
      for (let y = 1; y < ROWS - 1; y++) {
        const px = x * TILE, py = y * TILE
        ctx.fillStyle = (x + y) % 2 === 0 ? '#d8d0c4' : '#d0c8bc'
        ctx.fillRect(px, py, TILE, TILE)
        // 타일 줄눈
        ctx.fillStyle = '#c0b8ac'
        ctx.fillRect(px, py, TILE, 1)
        ctx.fillRect(px, py, 1, TILE)
      }
    }

    // 부서별 구역 바닥 + 테두리
    for (const zone of DEPT_ZONES) {
      const zx = zone.x * TILE, zy = zone.y * TILE
      const zw = zone.w * TILE, zh = zone.h * TILE

      // 바닥
      for (let dy = 0; dy < zone.h; dy++) {
        for (let dx = 0; dx < zone.w; dx++) {
          drawFloorTile(ctx, (zone.x + dx) * TILE, (zone.y + dy) * TILE, zone.floor, zone.floorAlt, zone.x + dx, zone.y + dy)
        }
      }

      // 방 테두리
      ctx.strokeStyle = zone.borderColor
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.strokeRect(zx + 1, zy + 1, zw - 2, zh - 2)
      ctx.globalAlpha = 1

      // 방 라벨 (상단) — 밝은 배경 위 화이트 바
      ctx.font = 'bold 11px "Pretendard", sans-serif'
      const labelW = ctx.measureText(zone.label).width + 14
      // 라벨 배경 (흰색 반투명)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillRect(zx + 4, zy + 3, labelW, 18)
      // 라벨 좌측 색상 바
      ctx.fillStyle = zone.borderColor
      ctx.fillRect(zx + 4, zy + 3, 3, 18)
      // 라벨 텍스트
      ctx.fillStyle = '#333'
      ctx.fillText(zone.label, zx + 10, zy + 16)
    }

    // ── 가구 배치
    // 각 직원 좌석에 책상
    for (let i = 0; i < EMPLOYEES.length; i++) {
      const seat = seatPosition(i)
      drawDesk(ctx, seat.x * TILE, (seat.y - 1) * TILE, frame)
    }

    // 화분 (각 구역 모서리)
    drawPlant(ctx, 6 * TILE, 1 * TILE, frame)
    drawPlant(ctx, 13 * TILE, 1 * TILE, frame)
    drawPlant(ctx, 20 * TILE, 1 * TILE, frame)
    drawPlant(ctx, 10 * TILE, 6 * TILE, frame)
    drawPlant(ctx, 5 * TILE, 11 * TILE, frame)
    drawPlant(ctx, 17 * TILE, 11 * TILE, frame)

    // 정수기
    drawWaterCooler(ctx, 16 * TILE, 6 * TILE)
    drawWaterCooler(ctx, 11 * TILE, 11 * TILE)

    // 책장
    drawBookshelf(ctx, 22 * TILE, 11 * TILE)
    drawBookshelf(ctx, 7 * TILE, 16 * TILE)

    // 회의실 테이블
    drawMeetingTable(ctx, 11 * TILE + 4, 17 * TILE + 8, 4 * TILE - 8, 2 * TILE - 8)

    // 대표실 가구
    const ceoX = 24 * TILE, ceoY = 6 * TILE
    // 대표 책상 (큰, 고급 나무)
    ctx.fillStyle = '#6b4020'
    ctx.fillRect(ceoX + 8, ceoY + TILE + 4, 2 * TILE + 20, TILE - 4)
    ctx.fillStyle = '#8a5530'
    ctx.fillRect(ceoX + 10, ceoY + TILE + 6, 2 * TILE + 16, TILE - 8)
    // 대표 의자 (가죽)
    ctx.fillStyle = '#553322'
    ctx.fillRect(ceoX + TILE + 4, ceoY + 2 * TILE + 4, TILE - 8, TILE - 8)
    ctx.fillStyle = '#774433'
    ctx.fillRect(ceoX + TILE + 6, ceoY + 2 * TILE + 6, TILE - 12, TILE - 12)

    // ── 직원 렌더 (y좌표 순서)
    const sorted = EMPLOYEES.map((emp, i) => ({ emp, i, st: states[emp.id] }))
      .filter(e => e.st)
      .sort((a, b) => (a.st?.y ?? 0) - (b.st?.y ?? 0))

    for (const { emp, i, st } of sorted) {
      if (!st) continue
      const px = st.x * TILE
      const py = st.y * TILE

      drawCharacter(ctx, px, py, emp.deptColor, st.status, frame, i, hoveredEmp === emp.id, emp.name, emp.emoji)

      // 말풍선
      if (st.bubble && st.bubbleTimer > 0) {
        const text = st.bubble.slice(0, 18)
        ctx.font = '10px "Pretendard", sans-serif'
        const tw = ctx.measureText(text).width + 12
        const bx = Math.max(2, Math.min(px + TILE / 2 - tw / 2, CANVAS_W - tw - 2))
        const by = py - 22

        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.strokeStyle = emp.deptColor
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(bx, by, tw, 18, 6)
        ctx.fill()
        ctx.stroke()
        // 꼬리
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.beginPath()
        ctx.moveTo(px + TILE / 2 - 3, by + 18)
        ctx.lineTo(px + TILE / 2, by + 22)
        ctx.lineTo(px + TILE / 2 + 3, by + 18)
        ctx.fill()
        // 텍스트
        ctx.fillStyle = '#333'
        ctx.fillText(text, bx + 6, by + 13)
      }
    }

    // ── 선택된 직원 상세 패널
    if (selectedEmp) {
      const emp = EMPLOYEES.find(e => e.id === selectedEmp)
      const st = states[selectedEmp] ?? { status: 'idle' as const }
      if (emp) {
        const hasRepos = emp.repos && emp.repos.length > 0
        const panelW = 200
        const panelH = hasRepos ? 80 : 64
        const panelX = CANVAS_W - panelW - 10
        const panelY = CANVAS_H - panelH - 10

        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.strokeStyle = emp.deptColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(panelX, panelY, panelW, panelH, 8)
        ctx.fill()
        ctx.stroke()
        // 상단 색상 바
        ctx.fillStyle = emp.deptColor
        ctx.fillRect(panelX + 2, panelY + 2, panelW - 4, 3)

        ctx.fillStyle = '#333'
        ctx.font = 'bold 12px "Pretendard", sans-serif'
        ctx.fillText(`${emp.emoji} ${emp.name}`, panelX + 10, panelY + 20)

        ctx.fillStyle = '#666'
        ctx.font = '10px "Pretendard", sans-serif'
        ctx.fillText(`${emp.dept} · ${emp.role} · ${emp.code}`, panelX + 10, panelY + 36)

        const sc = STATUS_COLORS[st.status]
        ctx.fillStyle = sc?.text ?? '#6b8cbb'
        ctx.font = 'bold 10px "Pretendard", sans-serif'
        ctx.fillText(`● ${sc?.label ?? st.status}`, panelX + 10, panelY + 52)

        ctx.fillStyle = '#888'
        ctx.font = '9px "Pretendard", sans-serif'
        ctx.fillText(emp.speech.slice(0, 24), panelX + 56, panelY + 52)

        if (hasRepos) {
          ctx.fillStyle = '#3366aa'
          ctx.font = 'bold 9px "Pretendard", sans-serif'
          ctx.fillText(`📦 ${emp.repos!.join(' · ')}`, panelX + 10, panelY + 68)
        }
      }
    }

    tickEmpBubbles()
  }, [hoveredEmp, selectedEmp, tickEmpBubbles])

  // 애니메이션 루프
  useEffect(() => {
    let lastTime = 0
    const interval = 1000 / FPS
    const loop = (time: number) => {
      animRef.current = requestAnimationFrame(loop)
      if (time - lastTime < interval) return
      lastTime = time
      draw()
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  // 마우스 → 직원 감지
  const tileFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width)
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height)
    return { tileX: Math.floor(mx / TILE), tileY: Math.floor(my / TILE) }
  }, [])

  const findEmpAt = useCallback((tileX: number, tileY: number) => {
    const states = useOfficeStore.getState().empStates
    for (let i = 0; i < EMPLOYEES.length; i++) {
      const emp = EMPLOYEES[i]
      const st = states[emp.id]
      const seat = seatPosition(i)
      const ex = st ? Math.floor(st.x) : seat.x
      const ey = st ? Math.floor(st.y) : seat.y
      if (ex === tileX && ey === tileY) return emp
    }
    return null
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const t = tileFromEvent(e)
    if (!t) return
    const emp = findEmpAt(t.tileX, t.tileY)
    setHoveredEmp(emp?.id ?? null)
  }, [tileFromEvent, findEmpAt])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const t = tileFromEvent(e)
    if (!t) return
    const emp = findEmpAt(t.tileX, t.tileY)
    if (emp) {
      setSelectedEmp(emp.id)
      setEmpBubble(emp.id, emp.speech, 350)
      addLog('employee', `[${emp.dept}] ${emp.name}: ${emp.speech}`)
    } else {
      setSelectedEmp(null)
    }
  }, [tileFromEvent, findEmpAt, setEmpBubble, addLog])

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center h-full p-2 gap-2 overflow-auto">
      {/* 범례 */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(STATUS_COLORS).map(([key, v]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.text }} />
            <span className="text-[10px] font-semibold" style={{ color: v.text }}>{v.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-[#4a6fa5]">|</span>
        {Object.entries(DEPT_COLORS).slice(0, 6).map(([d, c]) => (
          <div key={d} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
            <span className="text-[9px]" style={{ color: c }}>{d}</span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => setHoveredEmp(null)}
        className="rounded-lg border-2 border-[#1e3a5f] cursor-crosshair shadow-[0_0_30px_rgba(68,170,255,0.1)]"
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          imageRendering: 'pixelated',
        }}
      />

      <div className="flex items-center gap-4 text-[10px] text-[#6b8cbb]">
        <span>👥 {EMPLOYEES.length}명</span>
        <span>🏢 {COLS}×{ROWS}</span>
        <span>🖱️ 클릭 → 대화</span>
        <span>🎮 {FPS}fps</span>
      </div>
    </div>
  )
}
