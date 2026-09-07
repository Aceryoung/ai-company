// components/OfficeCanvas.tsx — 픽셀 게임 스타일 사무실 (Canvas 2D) v2
'use client'

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useOfficeStore, type EmployeeState, type EmployeeMood } from '../store/officeStore'
import { EMPLOYEES, STATUS_COLORS, DEPT_COLORS } from '../data/employees'

// ── 상수
const TILE = 36
const COLS = 28
const BASE_ROWS = 27          // 기본 캔버스 높이 (휴게실 포함)
const STATIC_SEATS = 49       // 정적 좌석 수 (이사 + 마케팅 + EMPLOYEES + 레드팀)
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

// 49명 각각의 외형 (이름 기반 성별 + 역할 기반 악세서리)
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
  // 채용: 윤서영(F), 정민호(M)
  { hairStyle: 'long', skinTone: SKIN_TONES[3], accessory: 'earring', isFemale: true },
  { hairStyle: 'short', skinTone: SKIN_TONES[4], accessory: 'tie', isFemale: false },
  // 경영: Claude(AI 이사)
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'tie', isFemale: false },
  // 마케팅: 서지원(F), 한예린(F), 박준형(M), 김나현(F-레드팀)
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[1], accessory: 'earring', isFemale: true },
  { hairStyle: 'long', skinTone: SKIN_TONES[2], accessory: 'none', isFemale: true },
  { hairStyle: 'spiky', skinTone: SKIN_TONES[3], accessory: 'glasses', isFemale: false },
  { hairStyle: 'bob', skinTone: SKIN_TONES[4], accessory: 'earring', isFemale: true },
  // ── 레드팀 (각 부서 1명씩)
  // R01 강현석(M) 시장조사
  { hairStyle: 'spiky', skinTone: SKIN_TONES[5], accessory: 'glasses', isFemale: false },
  // R02 이태준(M) 영업
  { hairStyle: 'short', skinTone: SKIN_TONES[6], accessory: 'tie', isFemale: false },
  // R03 박소현(F) 기획
  { hairStyle: 'bob', skinTone: SKIN_TONES[7], accessory: 'earring', isFemale: true },
  // R04 김영철(M) 검수
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'glasses', isFemale: false },
  // R05 나윤아(F) 개발
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[1], accessory: 'headset', isFemale: true },
  // R06 장세훈(M) 배포
  { hairStyle: 'spiky', skinTone: SKIN_TONES[2], accessory: 'none', isFemale: false },
  // R07 허지민(F) 고객소통
  { hairStyle: 'long', skinTone: SKIN_TONES[3], accessory: 'headset', isFemale: true },
  // R08 신동혁(M) 정산
  { hairStyle: 'short', skinTone: SKIN_TONES[4], accessory: 'glasses', isFemale: false },
  // R09 류미경(F) 회고
  { hairStyle: 'bun', skinTone: SKIN_TONES[5], accessory: 'earring', isFemale: true },
  // R10 전승우(M) 운영
  { hairStyle: 'spiky', skinTone: SKIN_TONES[6], accessory: 'glasses', isFemale: false },
  // R11 홍다은(F) 비서
  { hairStyle: 'ponytail', skinTone: SKIN_TONES[7], accessory: 'earring', isFemale: true },
  // R12 오정훈(M) 레포
  { hairStyle: 'short', skinTone: SKIN_TONES[0], accessory: 'none', isFemale: false },
  // R13 임수아(F) 채용
  { hairStyle: 'bob', skinTone: SKIN_TONES[1], accessory: 'glasses', isFemale: true },
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
  // 채용
  { dept: '채용', label: '👤 채용', x: 10, y: 16, w: 5, h: 4, floor: '#f4e6ee', floorAlt: '#ecdee6', borderColor: '#cc4477' },
  // 회의실
  { dept: '회의실', label: '🏢 회의실', x: 16, y: 16, w: 6, h: 4, floor: '#e0e8f0', floorAlt: '#d8e0e8', borderColor: '#557799' },
  // 경영실 (이사)
  { dept: '경영', label: '👔 경영', x: 24, y: 11, w: 3, h: 4, floor: '#f5ecd0', floorAlt: '#ede4c8', borderColor: '#ccaa00' },
  // 마케팅
  { dept: '마케팅', label: '📣 마케팅', x: 23, y: 16, w: 4, h: 4, floor: '#f4e0e0', floorAlt: '#ecd8d8', borderColor: '#cc4466' },
  // 휴게실
  { dept: '휴게실', label: '☕ 휴게실', x: 1, y: 21, w: 12, h: 5, floor: '#ece8f4', floorAlt: '#e4e0ec', borderColor: '#8866bb' },
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
    // 채용 (2명)
    { x: 11, y: 18 }, { x: 13, y: 18 },
    // ── 경영 이사 (1명)
    { x: 25, y: 13 }, // D01 Claude 이사
    // ── 마케팅 (3명 + 레드팀 1명)
    { x: 24, y: 18 }, // M01 마케팅 팀장
    { x: 25, y: 18 }, // M02 콘텐츠
    { x: 23, y: 18 }, // M03 퍼포먼스
    { x: 26, y: 18 }, // RM1 마케팅 레드팀
    // ── 레드팀 (각 부서에 1명씩, 기존 자리 사이에 배치)
    { x: 5, y: 3 },   // R01 시장조사
    { x: 10, y: 3 },  // R02 영업
    { x: 17, y: 3 },  // R03 기획
    { x: 24, y: 3 },  // R04 검수
    { x: 9, y: 8 },   // R05 개발
    { x: 14, y: 8 },  // R06 배포
    { x: 3, y: 13 },  // R07 고객소통
    { x: 9, y: 13 },  // R08 정산
    { x: 15, y: 13 }, // R09 회고
    { x: 20, y: 8 },  // R10 운영
    { x: 21, y: 13 }, // R11 비서
    { x: 5, y: 18 },  // R12 레포
    { x: 12, y: 18 }, // R13 채용
  ]
  // 정적 직원은 고정 좌석
  return seats[idx] ?? { x: 2 + ((idx - seats.length) % 8) * 3, y: 23 }
}

// 동적 직원 좌석: 부서 구역(zone) 내 배치
function dynamicSeatPosition(empIdx: number, dynamicEmployees: readonly { dept: string }[], dynamicZones: DeptZone[]): { x: number; y: number } {
  const emp = dynamicEmployees[empIdx]
  if (!emp) return { x: 2, y: 23 }
  const zone = dynamicZones.find(z => z.dept === emp.dept)
  if (!zone) return { x: 2, y: 23 }
  // 같은 부서의 직원 중 몇 번째인지
  let posInDept = 0
  for (let i = 0; i < empIdx; i++) {
    if (dynamicEmployees[i].dept === emp.dept) posInDept++
  }
  return {
    x: zone.x + 1 + posInDept * 3,   // 구역 내 가로 배치 (3칸 간격)
    y: zone.y + 2,                     // 구역 내 세로 중앙
  }
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

// ── 커피머신
function drawCoffeeMachine(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 본체
  ctx.fillStyle = '#444'
  ctx.fillRect(px + 8, py + 8, 20, 24)
  ctx.fillStyle = '#555'
  ctx.fillRect(px + 10, py + 10, 16, 20)
  // 상단 물탱크
  ctx.fillStyle = '#666'
  ctx.fillRect(px + 10, py + 4, 16, 8)
  ctx.fillStyle = '#5588cc'
  ctx.fillRect(px + 12, py + 6, 12, 4)
  // 컵 받침
  ctx.fillStyle = '#888'
  ctx.fillRect(px + 12, py + 26, 12, 4)
  // 컵
  ctx.fillStyle = '#fff'
  ctx.fillRect(px + 14, py + 22, 8, 6)
  ctx.fillStyle = '#eee'
  ctx.fillRect(px + 15, py + 23, 6, 4)
  // 커피 색 (채워지는 애니)
  if (frame % 120 < 60) {
    const fill = Math.min((frame % 60) / 30, 1)
    ctx.fillStyle = '#6b3a1a'
    ctx.fillRect(px + 15, py + 27 - fill * 4, 6, fill * 4)
  }
  // 버튼 (빨간불)
  ctx.fillStyle = frame % 120 < 60 ? '#f44' : '#4a4'
  ctx.fillRect(px + 24, py + 14, 3, 3)
  // 스팀 (동작 중일 때)
  if (frame % 120 < 60) {
    ctx.fillStyle = 'rgba(200,200,200,0.3)'
    const steamY = Math.sin(frame * 0.2) * 2
    ctx.fillRect(px + 16, py + 16 + steamY, 2, 4)
    ctx.fillRect(px + 20, py + 14 + steamY, 2, 5)
  }
}

// ── 화이트보드
function drawWhiteboard(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 프레임
  ctx.fillStyle = '#aaa'
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 8)
  // 보드 면
  ctx.fillStyle = '#f8f8f0'
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 12)
  // 글씨 (다양한 색)
  const colors = ['#d44', '#44d', '#4a4', '#da4']
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i]
    const lineW = 8 + ((i * 7 + frame) % 5) * 2
    ctx.fillRect(px + 6, py + 6 + i * 5, lineW, 2)
  }
  // 하단 마커 트레이
  ctx.fillStyle = '#888'
  ctx.fillRect(px + 4, py + TILE - 7, TILE - 8, 3)
  // 마커들
  ctx.fillStyle = '#d44'
  ctx.fillRect(px + 6, py + TILE - 10, 3, 5)
  ctx.fillStyle = '#44d'
  ctx.fillRect(px + 11, py + TILE - 10, 3, 5)
  ctx.fillStyle = '#4a4'
  ctx.fillRect(px + 16, py + TILE - 10, 3, 5)
}

// ── 프린터
function drawPrinter(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 본체
  ctx.fillStyle = '#ddd'
  ctx.fillRect(px + 6, py + 14, 24, 14)
  ctx.fillStyle = '#ccc'
  ctx.fillRect(px + 8, py + 16, 20, 10)
  // 상단 급지 트레이
  ctx.fillStyle = '#eee'
  ctx.fillRect(px + 8, py + 10, 20, 6)
  // 종이 (급지대)
  ctx.fillStyle = '#fff'
  ctx.fillRect(px + 10, py + 8, 16, 4)
  // 출력 트레이
  ctx.fillStyle = '#bbb'
  ctx.fillRect(px + 8, py + 26, 20, 4)
  // 인쇄 중 종이
  if (frame % 180 < 40) {
    ctx.fillStyle = '#fff'
    const paperOut = Math.min((frame % 40) / 20, 1)
    ctx.fillRect(px + 10, py + 26, 16, 2 + paperOut * 6)
    // 인쇄 내용
    if (paperOut > 0.5) {
      ctx.fillStyle = '#333'
      ctx.fillRect(px + 12, py + 28, 10, 1)
      ctx.fillRect(px + 12, py + 30, 8, 1)
    }
  }
  // LED
  ctx.fillStyle = frame % 180 < 40 ? '#4af' : '#4a4'
  ctx.fillRect(px + 26, py + 18, 2, 2)
}

// ── 소파 (휴게실)
function drawSofa(ctx: CanvasRenderingContext2D, px: number, py: number, color: string) {
  // 등받이
  ctx.fillStyle = color
  ctx.fillRect(px + 2, py + 4, 32, 10)
  // 쿠션
  const lighter = color + 'cc'
  ctx.fillStyle = lighter
  ctx.fillRect(px + 4, py + 12, 13, 16)
  ctx.fillRect(px + 19, py + 12, 13, 16)
  // 쿠션 디테일
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(px + 6, py + 14, 9, 4)
  ctx.fillRect(px + 21, py + 14, 9, 4)
  // 팔걸이
  ctx.fillStyle = color
  ctx.fillRect(px, py + 6, 4, 22)
  ctx.fillRect(px + 32, py + 6, 4, 22)
}

// ── 자판기
function drawVendingMachine(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 본체
  ctx.fillStyle = '#3355aa'
  ctx.fillRect(px + 4, py + 2, 28, 32)
  ctx.fillStyle = '#4466bb'
  ctx.fillRect(px + 6, py + 4, 24, 28)
  // 진열대 (음료수들)
  const drinkColors = ['#f44', '#4a4', '#fa4', '#44f', '#f4a', '#4af']
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = drinkColors[(r * 4 + c) % drinkColors.length]
      ctx.fillRect(px + 8 + c * 5, py + 6 + r * 7, 4, 5)
    }
  }
  // 투입구
  ctx.fillStyle = '#222'
  ctx.fillRect(px + 22, py + 28, 6, 3)
  // LED
  ctx.fillStyle = frame % 60 < 30 ? '#4f4' : '#2a2'
  ctx.fillRect(px + 28, py + 6, 2, 2)
}

// ── TV/스크린 (벽걸이)
function drawTV(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number) {
  // 프레임
  ctx.fillStyle = '#222'
  ctx.fillRect(px + 2, py + 2, TILE * 2 - 4, TILE - 8)
  // 화면
  const flicker = frame % 180 < 120 ? '#2244aa' : '#224488'
  ctx.fillStyle = flicker
  ctx.fillRect(px + 4, py + 4, TILE * 2 - 8, TILE - 12)
  // 화면 내용 (차트/그래프)
  ctx.fillStyle = '#4af'
  for (let i = 0; i < 5; i++) {
    const h = 4 + Math.sin(frame * 0.05 + i * 1.2) * 6
    ctx.fillRect(px + 8 + i * 12, py + TILE - 14 - Math.abs(h), 8, Math.abs(h))
  }
  // 스탠드
  ctx.fillStyle = '#333'
  ctx.fillRect(px + TILE - 3, py + TILE - 6, 6, 6)
}

// ── 쿠션/빈백
function drawBeanbag(ctx: CanvasRenderingContext2D, px: number, py: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(px + TILE / 2, py + TILE / 2 + 4, 14, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.ellipse(px + TILE / 2 - 2, py + TILE / 2, 6, 4, -0.3, 0, Math.PI * 2)
  ctx.fill()
}

// ── 러그 (부서 입구)
function drawRug(ctx: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, color: string) {
  ctx.globalAlpha = 0.25
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(px, py, w, h, 4)
  ctx.fill()
  // 테두리 무늬
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.roundRect(px + 3, py + 2, w - 6, h - 4, 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

// ── 부서 글로우 (활동 강도에 따라)
function drawZoneGlow(ctx: CanvasRenderingContext2D, zone: DeptZone, activeCount: number, frame: number) {
  if (activeCount === 0) return
  const zx = zone.x * TILE, zy = zone.y * TILE
  const zw = zone.w * TILE, zh = zone.h * TILE
  const intensity = Math.min(activeCount / 4, 1) * 0.12
  const pulse = Math.sin(frame * 0.03) * 0.03
  ctx.globalAlpha = intensity + pulse
  ctx.fillStyle = zone.borderColor
  ctx.beginPath()
  ctx.roundRect(zx - 2, zy - 2, zw + 4, zh + 4, 6)
  ctx.fill()
  ctx.globalAlpha = 1
}

// ── 타이핑 파티클
function drawTypingParticles(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number, empIdx: number) {
  const seed = empIdx * 137
  for (let i = 0; i < 3; i++) {
    const t = (frame * 0.08 + i * 2.1 + seed) % 6.28
    const dx = Math.cos(t) * 8
    const dy = -Math.abs(Math.sin(t * 1.5)) * 10 - 4
    const alpha = 0.3 + Math.sin(frame * 0.15 + i) * 0.2
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#4af'
    ctx.fillRect(px + TILE / 2 + dx - 1, py - 6 + dy, 2, 2)
  }
  ctx.globalAlpha = 1
}

// ── 완료 반짝임
function drawDoneSparkle(ctx: CanvasRenderingContext2D, px: number, py: number, frame: number, empIdx: number) {
  const seed = empIdx * 97
  for (let i = 0; i < 4; i++) {
    const t = (frame * 0.06 + i * 1.57 + seed) % 6.28
    const r = 12 + Math.sin(frame * 0.1 + i) * 4
    const sx = px + TILE / 2 + Math.cos(t) * r
    const sy = py + TILE / 2 + Math.sin(t) * r
    const alpha = 0.4 + Math.sin(frame * 0.2 + i * 0.8) * 0.3
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffd700'
    // 십자 모양 반짝임
    ctx.fillRect(sx - 1, sy - 3, 2, 6)
    ctx.fillRect(sx - 3, sy - 1, 6, 2)
  }
  ctx.globalAlpha = 1
}

// ── 앰비언트 파티클 (부유하는 먼지/빛)
const AMBIENT_PARTICLES: { x: number; y: number; speed: number; size: number; alpha: number }[] = []
for (let i = 0; i < 30; i++) {
  AMBIENT_PARTICLES.push({
    x: Math.random() * 28 * TILE,
    y: Math.random() * 22 * TILE,
    speed: 0.1 + Math.random() * 0.3,
    size: 1 + Math.random() * 2,
    alpha: 0.05 + Math.random() * 0.1,
  })
}
function drawAmbientParticles(ctx: CanvasRenderingContext2D, frame: number, maxH: number) {
  for (const p of AMBIENT_PARTICLES) {
    p.y -= p.speed
    p.x += Math.sin(frame * 0.01 + p.y * 0.01) * 0.3
    if (p.y < 0) { p.y = maxH; p.x = Math.random() * 28 * TILE }
    ctx.globalAlpha = p.alpha + Math.sin(frame * 0.02 + p.x * 0.005) * 0.03
    ctx.fillStyle = '#ffe8a0'
    ctx.fillRect(p.x, p.y, p.size, p.size)
  }
  ctx.globalAlpha = 1
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
  // 걷기 상태 감지
  const empState = useOfficeStore.getState().empStates[EMPLOYEES[empIdx]?.id ?? ''] ?? null
  const isWalking = empState?.walking ?? false
  const walkCycle = isWalking ? Math.sin(frame * 0.6 + empIdx) : 0
  const bounce = isWalking
    ? Math.abs(Math.sin(frame * 0.6 + empIdx)) * 2  // 걸을 때 통통 튀기
    : Math.sin(frame * 0.3 + empIdx) * (status === 'work' ? 1.5 : 0.5)

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(px + TILE / 2, py + TILE - 4, 9, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  const cy = py + bounce

  // ── 다리 + 신발 (걸을 때 다리 움직임)
  const legSwing = isWalking ? Math.round(walkCycle * 3) : 0
  if (traits.isFemale) {
    ctx.fillStyle = deptColor
    ctx.fillRect(px + 10, cy + 26, 16, 3)
    ctx.fillStyle = skin
    ctx.fillRect(px + 12 + legSwing, cy + 29, 4, 3)
    ctx.fillRect(px + 20 - legSwing, cy + 29, 4, 3)
    ctx.fillStyle = '#444'
    ctx.fillRect(px + 11 + legSwing, cy + 31, 6, 2)
    ctx.fillRect(px + 19 - legSwing, cy + 31, 6, 2)
  } else {
    ctx.fillStyle = '#2a2a44'
    ctx.fillRect(px + 12 + legSwing, cy + 26, 5, 6)
    ctx.fillRect(px + 19 - legSwing, cy + 26, 5, 6)
    ctx.fillStyle = '#333'
    ctx.fillRect(px + 11 + legSwing, cy + 31, 7, 2)
    ctx.fillRect(px + 18 - legSwing, cy + 31, 7, 2)
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

  // ── 기지개 감지 (idleTimer가 낮을 때 = 오래 앉아있을 때)
  const idleT = empState?.idleTimer ?? 200
  const isStretching = !isWalking && status === 'idle' && idleT > 0 && idleT < 30 && (empIdx % 3 === 0)

  // ── 의자 회전 (idle 상태에서 미세 움직임)
  const chairWobble = (!isWalking && status === 'idle') ? Math.sin(frame * 0.04 + empIdx * 1.7) * 0.5 : 0

  // ── 팔 (걸을 때 팔 흔들기 / 기지개 / 타이핑)
  let leftArmY = cy + 17
  let rightArmY = cy + 17
  let leftHandY = cy + 25
  let rightHandY = cy + 25

  if (isStretching) {
    // 기지개 — 팔을 위로 뻗기
    const stretchPhase = Math.sin(frame * 0.15) * 6
    leftArmY = cy + 11 - stretchPhase
    rightArmY = cy + 11 - stretchPhase
    leftHandY = cy + 19 - stretchPhase
    rightHandY = cy + 19 - stretchPhase
  } else if (isWalking) {
    const armSwing = Math.round(walkCycle * 2)
    leftArmY = cy + 17 - armSwing
    rightArmY = cy + 17 + armSwing
    leftHandY = cy + 25 - armSwing
    rightHandY = cy + 25 + armSwing
  } else if (status === 'work') {
    // 타이핑 — 손이 작게 움직임
    const typeL = Math.sin(frame * 0.8 + empIdx) * 1.5
    const typeR = Math.sin(frame * 0.8 + empIdx + 1.5) * 1.5
    leftHandY = cy + 25 + typeL
    rightHandY = cy + 25 + typeR
  }

  ctx.fillStyle = deptColor
  ctx.fillRect(px + 5 + chairWobble, leftArmY, 5, 9)
  ctx.fillRect(px + 26 + chairWobble, rightArmY, 5, 9)
  // 손
  ctx.fillStyle = skin
  ctx.fillRect(px + 5 + chairWobble, leftHandY, 5, 3)
  ctx.fillRect(px + 26 + chairWobble, rightHandY, 5, 3)

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

  // ── 눈 (깜빡임: 4초 주기, 3프레임 감김)
  const blinkCycle = (frame + empIdx * 37) % 48 // ~4초 @12fps
  const isBlinking = blinkCycle >= 45 // 마지막 3프레임 = 감김

  if (isBlinking) {
    // 눈 감은 상태 —
    ctx.fillStyle = '#222'
    ctx.fillRect(px + 12, cy + 11, 5, 1)
    ctx.fillRect(px + 20, cy + 11, 5, 1)
  } else if (status === 'work') {
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
    // 일반 눈 (흰자 + 동자) — 고개 돌리기: 동자 위치가 살짝 이동
    const lookDir = Math.sin(frame * 0.02 + empIdx * 2.3) // -1~1 부드러운 이동
    const eyeShift = Math.round(lookDir * 1) // -1, 0, 1
    ctx.fillStyle = '#fff'
    ctx.fillRect(px + 12, cy + 9, 5, 4)
    ctx.fillRect(px + 20, cy + 9, 5, 4)
    ctx.fillStyle = '#222'
    ctx.fillRect(px + 14 + eyeShift, cy + 10, 3, 3)
    ctx.fillRect(px + 22 + eyeShift, cy + 10, 3, 3)
    // 눈 하이라이트
    ctx.fillStyle = '#fff'
    ctx.fillRect(px + 14 + eyeShift, cy + 10, 1, 1)
    ctx.fillRect(px + 22 + eyeShift, cy + 10, 1, 1)
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
  if (isStretching) {
    // 하품 — 큰 입
    ctx.fillStyle = '#c66'
    ctx.fillRect(px + 15, cy + 14, 6, 4)
    ctx.fillStyle = '#933'
    ctx.fillRect(px + 16, cy + 15, 4, 2)
  } else if (status === 'done') {
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

  // ── 상태/기분 이모지 (머리 위)
  const statusEmoji: Record<string, string> = {
    idle: '💤', work: '💻', done: '✅', boss: '📢', link: '🔗'
  }
  const moodEmoji: Record<string, string> = {
    normal: '', happy: '😊', focused: '🎯', tired: '😴', excited: '🎉', coffee: '☕'
  }
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  // 기분 이모지가 있으면 기분을 표시, 없으면 상태 이모지
  const mood = empState?.mood ?? 'normal'
  const displayEmoji = moodEmoji[mood] || statusEmoji[status] || '💤'
  ctx.fillText(displayEmoji, px + TILE / 2, cy + 1)
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

  // 호버 시 강조 (향상된 글로우 + 하이라이트)
  if (isHovered) {
    // 외곽 글로우
    ctx.shadowColor = deptColor
    ctx.shadowBlur = 12
    ctx.strokeStyle = deptColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(px + 2, cy - 1, TILE - 4, TILE, 4)
    ctx.stroke()
    ctx.shadowBlur = 0
    // 내부 하이라이트
    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.roundRect(px + 2, cy - 1, TILE - 4, TILE, 4)
    ctx.fill()
    ctx.globalAlpha = 1
    // 포인터 화살표 (위)
    ctx.fillStyle = deptColor
    ctx.beginPath()
    ctx.moveTo(px + TILE / 2 - 4, cy - 5)
    ctx.lineTo(px + TILE / 2, cy - 9)
    ctx.lineTo(px + TILE / 2 + 4, cy - 5)
    ctx.fill()
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
  const hoveredRef = useRef<string | null>(null)
  const selectedRef = useRef<string | null>(null)
  hoveredRef.current = hoveredEmp
  selectedRef.current = selectedEmp

  const empStates = useOfficeStore((s) => s.empStates)
  const setEmpBubble = useOfficeStore((s) => s.setEmpBubble)
  const tickEmpBubbles = useOfficeStore((s) => s.tickEmpBubbles)
  const addLog = useOfficeStore((s) => s.addLog)
  const setSelectedEmployee = useOfficeStore((s) => s.setSelectedEmployee)
  const dynamicEmployees = useOfficeStore((s) => s.dynamicEmployees)

  // 정적 + 동적 직원 합치기
  const allEmployees = useMemo(() => [...EMPLOYEES, ...dynamicEmployees], [dynamicEmployees])

  // 동적 부서별 직원 그룹 + 좌석 + 캔버스 크기 계산
  const { ROWS, CANVAS_W, CANVAS_H, dynamicZones } = useMemo(() => {
    // 동적 부서별로 직원 그룹핑
    const deptMap = new Map<string, number>()  // dept → 해당 부서 직원 수
    for (const emp of dynamicEmployees) {
      deptMap.set(emp.dept, (deptMap.get(emp.dept) ?? 0) + 1)
    }

    if (deptMap.size === 0) {
      const r = BASE_ROWS
      return { ROWS: r, CANVAS_W: COLS * TILE, CANVAS_H: r * TILE, dynamicZones: [] as DeptZone[] }
    }

    // 각 동적 부서에 구역 할당 (기존 마지막 행 y=16 다음, y=21부터)
    const zones: DeptZone[] = []
    const ZONE_COLORS = [
      { floor: '#f0e6f4', floorAlt: '#e8dee8', borderColor: '#aa55cc' },
      { floor: '#e6f4e8', floorAlt: '#dee8e0', borderColor: '#44aa66' },
      { floor: '#f4f0e6', floorAlt: '#e8e4de', borderColor: '#ccaa33' },
      { floor: '#e6eef4', floorAlt: '#dee6e8', borderColor: '#4488bb' },
      { floor: '#f4e6e6', floorAlt: '#e8dede', borderColor: '#cc5555' },
    ]
    const DEPT_EMOJIS: Record<string, string> = {
      마케팅: '📣', 디자인: '🎨', 인사: '👥', 법무: '⚖️', 재무: '💵',
      홍보: '📢', 전략: '🎯', 물류: '📦', 연구: '🔬', 교육: '📚',
    }

    let zoneX = 1
    const zoneY = 21  // 기존 부서들(y=16, h=4) 아래, 벽(y=20) 다음
    let deptIdx = 0
    for (const [dept, count] of deptMap) {
      const w = Math.max(count * 3, 5)  // 직원 수에 맞는 너비 (최소 5)
      const colorSet = ZONE_COLORS[deptIdx % ZONE_COLORS.length]
      const emoji = DEPT_EMOJIS[dept] ?? '🏢'
      zones.push({
        dept,
        label: `${emoji} ${dept}`,
        x: zoneX, y: zoneY + Math.floor(deptIdx / 3) * 5,
        w, h: 4,
        ...colorSet,
      })
      zoneX += w + 1
      if (zoneX + 5 > COLS - 1) {  // 다음 줄로
        zoneX = 1
        deptIdx++  // floor 계산용
      } else {
        deptIdx++
      }
    }

    // 캔버스 높이 계산
    const maxZoneBottom = Math.max(...zones.map(z => z.y + z.h))
    const needed = maxZoneBottom + 2  // 아래 벽 + 여유
    const r = Math.max(BASE_ROWS, needed)
    return { ROWS: r, CANVAS_W: COLS * TILE, CANVAS_H: r * TILE, dynamicZones: zones }
  }, [dynamicEmployees])

  // 좌석 결정 통합 헬퍼: 정적 → seatPosition, 동적 → dynamicSeatPosition
  const getSeat = useCallback((i: number) => {
    if (i < STATIC_SEATS) return seatPosition(i)
    return dynamicSeatPosition(i - STATIC_SEATS, dynamicEmployees, dynamicZones)
  }, [dynamicEmployees, dynamicZones])

  // 초기 직원 좌석 배치
  useEffect(() => {
    for (let i = 0; i < allEmployees.length; i++) {
      const emp = allEmployees[i]
      const seat = getSeat(i)
      const st = useOfficeStore.getState().empStates[emp.id]
      // walking 중인 직원은 덮어쓰지 않음 (회의실 이동 중일 수 있음)
      if (!st) {
        useOfficeStore.setState((s) => ({
          empStates: {
            ...s.empStates,
            [emp.id]: {
              status: 'idle',
              mood: 'normal' as EmployeeMood,
              bubble: '',
              bubbleTimer: 0,
              x: seat.x, y: seat.y,
              tx: seat.x, ty: seat.y,
              walking: false,
              idleTimer: 200 + Math.floor(Math.random() * 600),
              returningHome: false,
            },
          },
        }))
      } else if (st.x === 0 && st.y === 0 && !st.walking) {
        useOfficeStore.setState((s) => ({
          empStates: {
            ...s.empStates,
            [emp.id]: {
              ...s.empStates[emp.id],
              x: seat.x, y: seat.y,
              tx: seat.x, ty: seat.y,
            },
          },
        }))
      }
    }
  }, [allEmployees, getSeat])  // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [CANVAS_W, CANVAS_H])

  // ── 렌더 루프 (ref 기반 — effect에서 직접 호출)
  const allEmployeesRef = useRef(allEmployees)
  allEmployeesRef.current = allEmployees
  const getSeatRef = useRef(getSeat)
  getSeatRef.current = getSeat
  const dynamicZonesRef = useRef(dynamicZones)
  dynamicZonesRef.current = dynamicZones
  const canvasSizeRef = useRef({ ROWS: BASE_ROWS, CANVAS_W: COLS * TILE, CANVAS_H: BASE_ROWS * TILE })
  canvasSizeRef.current = { ROWS, CANVAS_W, CANVAS_H }
  const tickRef = useRef(tickEmpBubbles)
  tickRef.current = tickEmpBubbles
  const setEmpBubbleRef = useRef(setEmpBubble)
  setEmpBubbleRef.current = setEmpBubble

  const drawFn = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const states = useOfficeStore.getState().empStates
    const frame = frameRef.current++
    const hoveredEmpVal = hoveredRef.current
    const selectedEmpVal = selectedRef.current
    const allEmps = allEmployeesRef.current
    const getSeatFn = getSeatRef.current
    const dynZones = dynamicZonesRef.current
    const { ROWS: rows, CANVAS_W: cW, CANVAS_H: cH } = canvasSizeRef.current

    // 전체 배경 (밝은 회색)
    ctx.fillStyle = '#c8c0b4'
    ctx.fillRect(0, 0, cW, cH)

    // 외벽 (창문)
    for (let x = 0; x < COLS; x++) {
      drawWindowWall(ctx, x * TILE, 0)
      drawWall(ctx, x * TILE, (rows - 1) * TILE)
    }
    for (let y = 0; y < rows; y++) {
      drawWall(ctx, 0, y * TILE)
      drawWall(ctx, (COLS - 1) * TILE, y * TILE)
    }

    // 복도 바닥 (밝은 타일)
    for (let x = 1; x < COLS - 1; x++) {
      for (let y = 1; y < rows - 1; y++) {
        const px = x * TILE, py = y * TILE
        ctx.fillStyle = (x + y) % 2 === 0 ? '#d8d0c4' : '#d0c8bc'
        ctx.fillRect(px, py, TILE, TILE)
        // 타일 줄눈
        ctx.fillStyle = '#c0b8ac'
        ctx.fillRect(px, py, TILE, 1)
        ctx.fillRect(px, py, 1, TILE)
      }
    }

    // 부서별 구역 바닥 + 테두리 (정적 + 동적)
    const allZones = [...DEPT_ZONES, ...dynZones]

    // 부서별 활동 인원 카운트
    const zoneActivity: Map<string, number> = new Map()
    for (const emp of allEmps) {
      const st = states[emp.id]
      if (st && (st.status === 'work' || st.status === 'boss')) {
        zoneActivity.set(emp.dept, (zoneActivity.get(emp.dept) ?? 0) + 1)
      }
    }

    for (const zone of allZones) {
      const zx = zone.x * TILE, zy = zone.y * TILE
      const zw = zone.w * TILE, zh = zone.h * TILE

      // 글로우 이펙트 (활동 강도 기반)
      drawZoneGlow(ctx, zone, zoneActivity.get(zone.dept) ?? 0, frame)

      // 바닥
      for (let dy = 0; dy < zone.h; dy++) {
        for (let dx = 0; dx < zone.w; dx++) {
          drawFloorTile(ctx, (zone.x + dx) * TILE, (zone.y + dy) * TILE, zone.floor, zone.floorAlt, zone.x + dx, zone.y + dy)
        }
      }

      // 러그 (일부 구역에)
      if (zone.dept === '경영' || zone.dept === 'CEO') {
        drawRug(ctx, zx + 8, zy + zh - TILE + 4, zw - 16, TILE - 8, zone.borderColor)
      }

      // 방 테두리 (향상된 스타일)
      ctx.strokeStyle = zone.borderColor
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.roundRect(zx + 1, zy + 1, zw - 2, zh - 2, 3)
      ctx.stroke()
      ctx.globalAlpha = 1

      // 방 라벨 (향상 — 둥근 배지 스타일)
      ctx.font = 'bold 11px "Pretendard", sans-serif'
      const activeInZone = zoneActivity.get(zone.dept) ?? 0
      const labelText = zone.label
      const labelW = ctx.measureText(labelText).width + 14
      const countText = activeInZone > 0 ? `${activeInZone}` : ''
      const countW = countText ? ctx.measureText(countText).width + 10 : 0
      // 라벨 배경 (둥근 필)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.roundRect(zx + 4, zy + 3, labelW + countW + 4, 18, 4)
      ctx.fill()
      // 라벨 좌측 색상 바
      ctx.fillStyle = zone.borderColor
      ctx.beginPath()
      ctx.roundRect(zx + 4, zy + 3, 3, 18, [4, 0, 0, 4])
      ctx.fill()
      // 라벨 텍스트
      ctx.fillStyle = '#333'
      ctx.fillText(labelText, zx + 10, zy + 16)
      // 활동 인원 뱃지
      if (countText) {
        const badgeX = zx + 12 + labelW
        ctx.fillStyle = zone.borderColor
        ctx.beginPath()
        ctx.arc(badgeX, zy + 12, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px "Pretendard", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(countText, badgeX, zy + 15)
        ctx.textAlign = 'left'
        ctx.font = 'bold 11px "Pretendard", sans-serif'
      }
    }

    // ── 가구 배치
    // 각 직원 좌석에 책상
    for (let i = 0; i < allEmps.length; i++) {
      const seat = getSeatFn(i)
      drawDesk(ctx, seat.x * TILE, (seat.y - 1) * TILE, frame)
    }

    // 화분 (각 구역 모서리)
    drawPlant(ctx, 6 * TILE, 1 * TILE, frame)
    drawPlant(ctx, 13 * TILE, 1 * TILE, frame)
    drawPlant(ctx, 20 * TILE, 1 * TILE, frame)
    drawPlant(ctx, 10 * TILE, 6 * TILE, frame)
    drawPlant(ctx, 5 * TILE, 11 * TILE, frame)
    drawPlant(ctx, 17 * TILE, 11 * TILE, frame)
    drawPlant(ctx, 8 * TILE, 16 * TILE, frame)
    drawPlant(ctx, 26 * TILE, 6 * TILE, frame)

    // 정수기
    drawWaterCooler(ctx, 16 * TILE, 6 * TILE)
    drawWaterCooler(ctx, 11 * TILE, 11 * TILE)

    // 책장
    drawBookshelf(ctx, 22 * TILE, 11 * TILE)
    drawBookshelf(ctx, 7 * TILE, 16 * TILE)

    // 커피머신 (복도/휴게 공간 — 검수 영역 피해서 배치)
    drawCoffeeMachine(ctx, 17 * TILE, 6 * TILE, frame)

    // 화이트보드 (회의실, 기획)
    drawWhiteboard(ctx, 21 * TILE, 16 * TILE, frame)
    drawWhiteboard(ctx, 14 * TILE, 1 * TILE, frame)

    // 프린터 (레포팀 근처, 운영 근처)
    drawPrinter(ctx, 8 * TILE, 18 * TILE, frame)
    drawPrinter(ctx, 22 * TILE, 8 * TILE, frame)

    // 회의실 테이블
    drawMeetingTable(ctx, 11 * TILE + 4, 17 * TILE + 8, 4 * TILE - 8, 2 * TILE - 8)

    // ── 휴게실 가구
    drawSofa(ctx, 2 * TILE, 22 * TILE, '#7755aa')
    drawSofa(ctx, 5 * TILE, 22 * TILE, '#5577aa')
    drawTV(ctx, 3 * TILE, 21 * TILE, frame)
    drawVendingMachine(ctx, 10 * TILE, 21 * TILE, frame)
    drawBeanbag(ctx, 8 * TILE, 24 * TILE, '#aa6688')
    drawBeanbag(ctx, 9 * TILE, 23 * TILE, '#6688aa')
    drawPlant(ctx, 11 * TILE, 24 * TILE, frame)
    // 휴게실 작은 테이블
    ctx.fillStyle = '#8b6e4e'
    ctx.fillRect(7 * TILE + 4, 22 * TILE + 8, TILE - 8, TILE - 8)
    ctx.fillStyle = '#a0825e'
    ctx.fillRect(7 * TILE + 6, 22 * TILE + 10, TILE - 12, TILE - 12)
    // 휴게실 러그
    drawRug(ctx, 2 * TILE, 23 * TILE + 4, 6 * TILE, 2 * TILE - 8, '#8866bb')

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

    // ── 자율 행동 (자리 이탈 → 돌아다니기 → 복귀)
    const POI = [ // Points of Interest (정수기, 커피머신, 휴게실 등)
      { x: 16, y: 7 }, { x: 11, y: 12 }, // 정수기
      { x: 17, y: 7 },  // 커피머신
      { x: 18, y: 17 }, { x: 19, y: 17 }, // 회의실 근처
      { x: 3, y: 23 }, { x: 6, y: 23 }, { x: 9, y: 23 }, // 휴게실 (소파, 빈백)
    ]
    const MOODS: EmployeeMood[] = ['normal', 'happy', 'focused', 'tired', 'excited', 'coffee']
    if (frame % 3 === 0) { // 매 3프레임마다 체크 (성능)
      const idleUpdates: Record<string, Partial<EmployeeState>> = {}
      for (const emp of allEmps) {
        const st = states[emp.id]
        if (!st || st.walking) continue
        // idle 타이머 감소
        const newTimer = (st.idleTimer ?? 200) - 1
        if (newTimer <= 0 && !st.returningHome && st.status !== 'work' && st.status !== 'boss') {
          // 자리를 떠남 → POI로 이동
          const poi = POI[Math.floor(Math.random() * POI.length)]
          idleUpdates[emp.id] = {
            tx: poi.x, ty: poi.y,
            walking: true,
            returningHome: false,
            idleTimer: 150 + Math.floor(Math.random() * 200),
            mood: MOODS[Math.floor(Math.random() * MOODS.length)],
          }
        } else if (newTimer <= 0 && st.returningHome) {
          // POI에 도착 후 → 자리로 복귀 대기 끝
          const empIdx = allEmps.indexOf(emp)
          const seat = getSeatFn(empIdx)
          idleUpdates[emp.id] = {
            tx: seat.x, ty: seat.y,
            walking: true,
            returningHome: false,
            idleTimer: 400 + Math.floor(Math.random() * 800),
            mood: Math.random() > 0.5 ? 'happy' : 'normal',
          }
        } else if (!st.walking && newTimer > 0) {
          idleUpdates[emp.id] = { idleTimer: newTimer }
        }
      }
      if (Object.keys(idleUpdates).length > 0) {
        useOfficeStore.setState((s) => {
          const next = { ...s.empStates }
          for (const [id, upd] of Object.entries(idleUpdates)) {
            next[id] = { ...next[id], ...upd }
          }
          return { empStates: next }
        })
      }
    }

    // ── 직원 걷기 애니메이션 (x→tx, y→ty 보간)
    const WALK_SPEED = 0.15
    const stateUpdates: Record<string, Partial<EmployeeState>> = {}
    for (const emp of allEmps) {
      const st = states[emp.id]
      if (!st || !st.walking) continue
      const dx = st.tx - st.x
      const dy = st.ty - st.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.2) {
        // 도착 — POI에 도착하면 잠시 머물다 복귀 예정
        const isAtHome = (() => {
          const idx = allEmps.indexOf(emp)
          const seat = getSeatFn(idx)
          return Math.abs(st.tx - seat.x) < 1 && Math.abs(st.ty - seat.y) < 1
        })()
        stateUpdates[emp.id] = {
          x: st.tx, y: st.ty, walking: false,
          returningHome: !isAtHome, // POI에 도착 → 복귀 대기
          idleTimer: isAtHome ? (400 + Math.floor(Math.random() * 800)) : (60 + Math.floor(Math.random() * 120)),
        }
      } else {
        // 이동
        stateUpdates[emp.id] = {
          x: st.x + dx * WALK_SPEED,
          y: st.y + dy * WALK_SPEED,
        }
      }
    }
    if (Object.keys(stateUpdates).length > 0) {
      useOfficeStore.setState((s) => {
        const next = { ...s.empStates }
        for (const [id, upd] of Object.entries(stateUpdates)) {
          next[id] = { ...next[id], ...upd }
        }
        return { empStates: next }
      })
    }

    // ── 근처 직원 대화 감지 (매 60프레임 = 5초마다 체크)
    if (frame % 60 === 0) {
      for (let i = 0; i < allEmps.length; i++) {
        const st1 = states[allEmps[i].id]
        if (!st1 || st1.walking || st1.bubble) continue
        for (let j = i + 1; j < allEmployees.length; j++) {
          const st2 = states[allEmployees[j].id]
          if (!st2 || st2.walking || st2.bubble) continue
          const dx = (st1.x - st2.x)
          const dy = (st1.y - st2.y)
          const dist = Math.sqrt(dx * dx + dy * dy)
          // 2타일 이내 + 둘 다 자리에 없으면 (POI 근처) 대화
          const seat1 = getSeatFn(i)
          const seat2 = getSeatFn(j)
          const isAway1 = Math.abs(st1.x - seat1.x) > 1 || Math.abs(st1.y - seat1.y) > 1
          const isAway2 = Math.abs(st2.x - seat2.x) > 1 || Math.abs(st2.y - seat2.y) > 1
          if (dist < 2.5 && isAway1 && isAway2 && Math.random() > 0.6) {
            const chatMsgs = ['안녕~', '오늘 바빠?', '커피 한잔?', '점심 뭐 먹지', '화이팅!', '수고해요~', '오 반가워!']
            const msg = chatMsgs[Math.floor(Math.random() * chatMsgs.length)]
            setEmpBubbleRef.current(allEmps[i].id, `💬 ${msg}`, 80)
            break
          }
        }
      }
    }

    // ── 커피 마시기 이펙트 (커피머신 근처에서 idle)
    for (const emp of allEmps) {
      const st = states[emp.id]
      if (!st || st.walking || st.status === 'work') continue
      const atCoffee = Math.abs(st.x - 17) < 1.5 && Math.abs(st.y - 7) < 1.5
      if (atCoffee && frame % 36 < 18) {
        const cpx = st.x * TILE
        const cpy = st.y * TILE
        // 컵 들고 있는 모션
        ctx.fillStyle = '#fff'
        ctx.fillRect(cpx + 4, cpy + 14, 5, 5)
        ctx.fillStyle = '#6b3a1a'
        ctx.fillRect(cpx + 5, cpy + 15, 3, 3)
        // 스팀
        ctx.fillStyle = 'rgba(200,200,200,0.4)'
        const steamY = Math.sin(frame * 0.3) * 2
        ctx.fillRect(cpx + 5, cpy + 10 + steamY, 1, 3)
        ctx.fillRect(cpx + 7, cpy + 9 + steamY, 1, 4)
      }
    }

    // ── 직원 렌더 (y좌표 순서)
    const sorted = allEmps.map((emp, i) => ({ emp, i, st: states[emp.id] }))
      .filter(e => e.st)
      .sort((a, b) => (a.st?.y ?? 0) - (b.st?.y ?? 0))

    for (const { emp, i, st } of sorted) {
      if (!st) continue
      const px = st.x * TILE
      const py = st.y * TILE

      drawCharacter(ctx, px, py, emp.deptColor, st.status, frame, i, hoveredEmpVal === emp.id, emp.name, emp.emoji)

      // 상태별 파티클 이펙트
      if (st.status === 'work') {
        drawTypingParticles(ctx, px, py, frame, i)
      } else if (st.status === 'done') {
        drawDoneSparkle(ctx, px, py, frame, i)
      }

      // 말풍선
      if (st.bubble && st.bubbleTimer > 0) {
        const text = st.bubble.slice(0, 18)
        ctx.font = '10px "Pretendard", sans-serif'
        const tw = ctx.measureText(text).width + 12
        const bx = Math.max(2, Math.min(px + TILE / 2 - tw / 2, cW - tw - 2))
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

    // 앰비언트 파티클 (최상단 레이어)
    drawAmbientParticles(ctx, frame, cH)

    // ── 선택된 직원 상세 패널 (향상)
    if (selectedEmpVal) {
      const emp = allEmps.find(e => e.id === selectedEmpVal)
      const st = states[selectedEmpVal] ?? { status: 'idle' as const }
      if (emp) {
        const hasRepos = emp.repos && emp.repos.length > 0
        const panelW = 220
        const panelH = hasRepos ? 100 : 82
        const panelX = cW - panelW - 10
        const panelY = cH - panelH - 10

        // 그림자
        ctx.shadowColor = 'rgba(0,0,0,0.2)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4
        ctx.fillStyle = 'rgba(255,255,255,0.97)'
        ctx.beginPath()
        ctx.roundRect(panelX, panelY, panelW, panelH, 10)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0

        // 테두리
        ctx.strokeStyle = emp.deptColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(panelX, panelY, panelW, panelH, 10)
        ctx.stroke()

        // 상단 색상 그라데이션 바
        ctx.fillStyle = emp.deptColor
        ctx.beginPath()
        ctx.roundRect(panelX + 2, panelY + 2, panelW - 4, 4, [8, 8, 0, 0])
        ctx.fill()
        ctx.globalAlpha = 0.3
        ctx.fillStyle = emp.deptColor
        ctx.fillRect(panelX + 2, panelY + 6, panelW - 4, 8)
        ctx.globalAlpha = 1

        // 아바타 원
        const avatarX = panelX + 22
        const avatarY = panelY + 26
        ctx.fillStyle = emp.deptColor
        ctx.beginPath()
        ctx.arc(avatarX, avatarY, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px "Pretendard", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(emp.emoji, avatarX, avatarY + 4)
        ctx.textAlign = 'left'

        // 이름 + 부서
        ctx.fillStyle = '#222'
        ctx.font = 'bold 13px "Pretendard", sans-serif'
        ctx.fillText(emp.name, panelX + 40, panelY + 24)

        ctx.fillStyle = '#777'
        ctx.font = '10px "Pretendard", sans-serif'
        ctx.fillText(`${emp.dept} · ${emp.role}`, panelX + 40, panelY + 38)

        // 상태 뱃지
        const sc = STATUS_COLORS[st.status]
        const statusLabel = sc?.label ?? st.status
        ctx.font = 'bold 9px "Pretendard", sans-serif'
        const statusW = ctx.measureText(`● ${statusLabel}`).width + 12
        ctx.fillStyle = (sc?.text ?? '#6b8cbb') + '20'
        ctx.beginPath()
        ctx.roundRect(panelX + 10, panelY + 48, statusW, 16, 8)
        ctx.fill()
        ctx.fillStyle = sc?.text ?? '#6b8cbb'
        ctx.fillText(`● ${statusLabel}`, panelX + 16, panelY + 59)

        // 한마디
        ctx.fillStyle = '#999'
        ctx.font = '9px "Pretendard", sans-serif'
        ctx.fillText(`"${emp.speech.slice(0, 22)}"`, panelX + 10, panelY + 74)

        if (hasRepos) {
          ctx.fillStyle = '#3366aa'
          ctx.font = 'bold 9px "Pretendard", sans-serif'
          ctx.fillText(`📦 ${emp.repos!.join(' · ')}`, panelX + 10, panelY + 90)
        }
      }
    }

    tickRef.current()
  }

  // 애니메이션 루프 (마운트 1회, ref 경유로 최신 상태 항상 참조)
  useEffect(() => {
    let lastTime = 0
    const interval = 1000 / FPS
    let running = true
    const loop = (time: number) => {
      if (!running) return
      animRef.current = requestAnimationFrame(loop)
      if (time - lastTime < interval) return
      lastTime = time
      drawFn()
    }
    animRef.current = requestAnimationFrame(loop)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 마우스 → 직원 감지
  const tileFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width)
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height)
    return { tileX: Math.floor(mx / TILE), tileY: Math.floor(my / TILE) }
  }, [CANVAS_W, CANVAS_H])

  const findEmpAt = useCallback((tileX: number, tileY: number) => {
    const states = useOfficeStore.getState().empStates
    const all = [...EMPLOYEES, ...useOfficeStore.getState().dynamicEmployees]
    for (let i = 0; i < all.length; i++) {
      const emp = all[i]
      const st = states[emp.id]
      const seat = getSeat(i)
      const ex = st ? Math.floor(st.x) : seat.x
      const ey = st ? Math.floor(st.y) : seat.y
      if (ex === tileX && ey === tileY) return emp
    }
    return null
  }, [getSeat])

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
      setSelectedEmployee(emp)
      setEmpBubble(emp.id, emp.speech, 350)
      addLog('sys', `🗣️ ${emp.name}(${emp.dept} ${emp.role})과 대화를 시작합니다.`)
    } else {
      setSelectedEmp(null)
      setSelectedEmployee(null)
    }
  }, [tileFromEvent, findEmpAt, setEmpBubble, addLog, setSelectedEmployee])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const t = tileFromEvent(e)
    if (!t) return
    const emp = findEmpAt(t.tileX, t.tileY)
    if (emp) {
      setSelectedEmp(emp.id)
      setSelectedEmployee(emp)
      addLog('sys', `🗣️ ${emp.name}(${emp.dept} ${emp.role})과 대화를 시작합니다.`)
    }
  }, [tileFromEvent, findEmpAt, setSelectedEmployee, addLog])

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
        onDoubleClick={handleDoubleClick}
        onMouseLeave={() => setHoveredEmp(null)}
        className="rounded-lg border-2 border-[#1e3a5f] cursor-crosshair shadow-[0_0_30px_rgba(68,170,255,0.1)]"
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          imageRendering: 'pixelated',
        }}
      />

      <div className="flex items-center gap-3 text-[10px] text-[#6b8cbb] bg-[#0a0e1a]/60 px-3 py-1.5 rounded-full border border-[#1e3a5f]/50">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4af] animate-pulse" />👥 {allEmployees.length}명</span>
        <span className="text-[#1e3a5f]">│</span>
        <span>🖱️ 클릭=정보 · 더블클릭=대화</span>
        <span className="text-[#1e3a5f]">│</span>
        <span className="text-[#4a6a8a]">🎮 {FPS}fps · {COLS}×{ROWS}</span>
      </div>
    </div>
  )
}
