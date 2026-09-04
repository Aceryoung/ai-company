// components/UsageMeter.tsx — Claude 한도 미터 (5시간 / 주간)
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { createClient } from '@/lib/supabase/client'

// ── 남은 시간 포맷
function formatCountdown(resetAt: number | null): string {
  if (!resetAt) return '--:--'
  const diff = resetAt - Date.now()
  if (diff <= 0) return '리셋됨'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}시간 ${m}분`
}

// ── 경고 레벨
function getLevel(pct: number): 'ok' | 'warn' | 'danger' {
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warn'
  return 'ok'
}

const COLORS = {
  ok:     { bar: '#0f0', text: '#0f0', bg: '#001a00' },
  warn:   { bar: '#f80', text: '#f80', bg: '#1a0800' },
  danger: { bar: '#f44', text: '#f44', bg: '#1a0000' },
}

export function UsageMeter() {
  const { claudeLimits, setClaudeLimits, triggerLimit } = useOfficeStore()
  const [showDetail, setShowDetail] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editFiveHour, setEditFiveHour] = useState('')
  const [editFiveHourMin, setEditFiveHourMin] = useState('')
  const [editWeekly, setEditWeekly] = useState('')
  const [editWeeklyMin, setEditWeeklyMin] = useState('')
  const [tick, setTick] = useState(0)
  const loaded = useRef(false)

  // ── Supabase에서 한도 불러오기 (최초 1회)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('office_usage')
          .select('*')
          .eq('action', 'claude_limits')
          .order('created_at', { ascending: false })
          .limit(1)
        if (data && data.length > 0 && data[0].detail) {
          const saved = JSON.parse(data[0].detail)
          const now = Date.now()

          // 만료된 resetAt은 이미 리셋된 것으로 처리
          const fhResetAt = saved.fiveHourResetAt ?? null
          const wResetAt = saved.weeklyResetAt ?? null
          const fhExpired = fhResetAt && now >= fhResetAt
          const wExpired = wResetAt && now >= wResetAt

          setClaudeLimits({
            fiveHour: { pct: fhExpired ? 0 : (saved.fiveHourPct ?? 0), resetAt: fhExpired ? null : fhResetAt },
            weekly:   { pct: wExpired  ? 0 : (saved.weeklyPct ?? 0),   resetAt: wExpired  ? null : wResetAt },
          })
        }
      } catch { /* 무시 */ }
    })()
  }, [setClaudeLimits])

  // ── 1분마다 카운트다운 갱신 + 자동 리셋
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1)

      // resetAt 시간이 지났으면 자동으로 0%로 리셋
      const now = Date.now()
      const { fiveHour, weekly } = useOfficeStore.getState().claudeLimits
      const updates: Parameters<typeof setClaudeLimits>[0] = {}

      if (fiveHour.resetAt && now >= fiveHour.resetAt) {
        updates.fiveHour = { pct: 0, resetAt: null }
      }
      if (weekly.resetAt && now >= weekly.resetAt) {
        updates.weekly = { pct: 0, resetAt: null }
      }

      if (Object.keys(updates).length > 0) {
        setClaudeLimits(updates)
        // 한도 해제
        const store = useOfficeStore.getState()
        if (store.limitHit) store.resumeLimit()
      }
    }, 60_000)
    return () => clearInterval(iv)
  }, [setClaudeLimits])

  // ── 한도 저장 (Supabase + 스토어)
  const saveLimits = useCallback(async (
    fiveHourPct: number, fiveHourMin: number,
    weeklyPct: number, weeklyMin: number,
  ) => {
    const now = Date.now()
    const fiveHourResetAt = fiveHourMin > 0 ? now + fiveHourMin * 60_000 : null
    const weeklyResetAt = weeklyMin > 0 ? now + weeklyMin * 60_000 : null

    setClaudeLimits({
      fiveHour: { pct: fiveHourPct, resetAt: fiveHourResetAt },
      weekly:   { pct: weeklyPct,   resetAt: weeklyResetAt },
    })

    // 95% 이상이면 오피스 한도 트리거
    if (fiveHourPct >= 95 || weeklyPct >= 95) {
      const resetAt = fiveHourPct >= 95 ? fiveHourResetAt : weeklyResetAt
      triggerLimit(resetAt)
    }

    // Supabase 저장
    try {
      const supabase = createClient()
      await supabase.from('office_usage').insert({
        device: 'sync',
        action: 'claude_limits',
        detail: JSON.stringify({ fiveHourPct, fiveHourResetAt, weeklyPct, weeklyResetAt }),
      })
    } catch { /* 무시 */ }
  }, [setClaudeLimits, triggerLimit])

  // ── 편집 폼 제출
  const handleSave = () => {
    const fhPct = parseFloat(editFiveHour) || 0
    const fhMin = parseFloat(editFiveHourMin) || 0
    const wPct = parseFloat(editWeekly) || 0
    const wMin = parseFloat(editWeeklyMin) || 0
    saveLimits(fhPct, fhMin, wPct, wMin)
    setShowEdit(false)
  }

  const { fiveHour, weekly } = claudeLimits
  const maxPct = Math.max(fiveHour.pct, weekly.pct)
  const level = getLevel(maxPct)
  const c = COLORS[level]

  return (
    <div className="relative">
      {/* 헤더 버튼 */}
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="flex items-center gap-1.5 px-2 py-1 rounded border transition-colors"
        style={{ borderColor: `${c.text}40`, background: c.bg }}
      >
        <span className="text-[10px]">⚡</span>

        {/* 5시간 미니바 */}
        <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e3a5f' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(fiveHour.pct, 100)}%`, background: COLORS[getLevel(fiveHour.pct)].bar }}
          />
        </div>

        {/* 주간 미니바 */}
        <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e3a5f' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(weekly.pct, 100)}%`, background: COLORS[getLevel(weekly.pct)].bar }}
          />
        </div>

        <span className="text-[10px] font-bold" style={{ color: c.text }}>
          {Math.round(fiveHour.pct)}%
        </span>
      </button>

      {/* 상세 패널 */}
      {showDetail && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-72 bg-[#0d1829] border-2 rounded-lg p-3 shadow-xl"
          style={{ borderColor: c.text + '60' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">⚡ Claude 한도 현황</span>
            <button
              onClick={() => {
                setEditFiveHour(String(fiveHour.pct))
                setEditWeekly(String(weekly.pct))
                const fhRemain = fiveHour.resetAt ? Math.max(0, Math.round((fiveHour.resetAt - Date.now()) / 60_000)) : 0
                const wRemain = weekly.resetAt ? Math.max(0, Math.round((weekly.resetAt - Date.now()) / 60_000)) : 0
                setEditFiveHourMin(String(fhRemain))
                setEditWeeklyMin(String(wRemain))
                setShowEdit(!showEdit)
              }}
              className="text-[10px] px-1.5 py-0.5 rounded border border-[#4af40] text-[#4af] hover:bg-[#4af10]"
            >
              ✏️ 수정
            </button>
          </div>

          {/* 5시간 한도 */}
          <LimitRow
            label="⏱ 5시간 한도"
            pct={fiveHour.pct}
            resetAt={fiveHour.resetAt}
            tick={tick}
          />

          {/* 주간 한도 */}
          <LimitRow
            label="📆 주간 · 전체 모델"
            pct={weekly.pct}
            resetAt={weekly.resetAt}
            tick={tick}
          />

          {/* 수정 폼 */}
          {showEdit && (
            <div className="mt-3 pt-2 border-t border-[#1e3a5f]">
              <div className="text-[10px] text-[#6b8cbb] mb-2">한도 직접 입력</div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#6b8cbb] w-14 shrink-0">5시간</span>
                <input
                  value={editFiveHour}
                  onChange={e => setEditFiveHour(e.target.value)}
                  placeholder="%"
                  className="flex-1 px-2 py-1 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-[11px] rounded outline-none focus:border-[#4af] w-16"
                />
                <span className="text-[10px] text-[#6b8cbb]">%</span>
                <input
                  value={editFiveHourMin}
                  onChange={e => setEditFiveHourMin(e.target.value)}
                  placeholder="분"
                  className="w-14 px-2 py-1 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-[11px] rounded outline-none focus:border-[#4af]"
                />
                <span className="text-[10px] text-[#6b8cbb]">분</span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#6b8cbb] w-14 shrink-0">주간</span>
                <input
                  value={editWeekly}
                  onChange={e => setEditWeekly(e.target.value)}
                  placeholder="%"
                  className="flex-1 px-2 py-1 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-[11px] rounded outline-none focus:border-[#4af] w-16"
                />
                <span className="text-[10px] text-[#6b8cbb]">%</span>
                <input
                  value={editWeeklyMin}
                  onChange={e => setEditWeeklyMin(e.target.value)}
                  placeholder="분"
                  className="w-14 px-2 py-1 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-[11px] rounded outline-none focus:border-[#4af]"
                />
                <span className="text-[10px] text-[#6b8cbb]">분</span>
              </div>

              <button
                onClick={handleSave}
                className="w-full py-1.5 text-[11px] font-bold bg-[#001a00] border border-[#0f0] text-[#0f0] rounded hover:bg-[#002a00] transition-colors"
              >
                💾 저장 (전 기기 동기화)
              </button>
            </div>
          )}

          {/* 위험 경고 */}
          {maxPct >= 90 && (
            <div className="mt-2 text-[10px] text-[#f44] font-bold text-center animate-pulse">
              ⚠️ 한도 임박! 업무 속도를 줄이세요
            </div>
          )}

          {claudeLimits.updatedAt && (
            <div className="mt-2 text-[9px] text-[#4a6fa5] text-center">
              마지막 업데이트: {new Date(claudeLimits.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 한도 행
function LimitRow({ label, pct, resetAt, tick }: {
  label: string; pct: number; resetAt: number | null; tick: number
}) {
  const level = getLevel(pct)
  const c = COLORS[level]
  void tick // countdown 갱신용

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#6b8cbb]">{label}</span>
        <span className="text-[11px] font-bold" style={{ color: c.text }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full h-2 bg-[#1e3a5f] rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: c.bar }}
        />
      </div>
      <div className="text-[9px] text-[#4a6fa5]">
        🔄 {formatCountdown(resetAt)} 후 재설정
      </div>
    </div>
  )
}
