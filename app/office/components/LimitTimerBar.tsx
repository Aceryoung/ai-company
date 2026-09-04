// components/LimitTimerBar.tsx — 헤더 카운트다운 타이머
'use client'

import { useState, useEffect, useRef } from 'react'
import { useOfficeStore } from '../store/officeStore'

export function LimitTimerBar() {
  const { limitHit, limitResetTime, triggerLimit, resumeLimit } = useOfficeStore()
  const [showModal, setShowModal] = useState(false)
  const [timeInput, setTimeInput] = useState('')
  const [countdown, setCountdown] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 기본값: 오늘 오전 9시 KST
  const getDefaultTime = () => {
    const d = new Date()
    d.setHours(9, 0, 0, 0)
    if (d < new Date()) d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 16)
  }

  // 카운트다운 시작
  useEffect(() => {
    if (!limitResetTime) { setCountdown(''); return }
    if (intervalRef.current) clearInterval(intervalRef.current)

    const tick = () => {
      const diff = limitResetTime - Date.now()
      if (diff <= 0) {
        clearInterval(intervalRef.current!)
        resumeLimit()
        setCountdown('')
        // 브라우저 알림
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('✅ Claude 한도 재설정', { body: 'AI COMPANY 직원들이 다시 일을 시작해요!' })
        }
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setCountdown(h > 0
        ? `${h}시간 ${String(m).padStart(2, '0')}분`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [limitResetTime])

  const confirmLimit = () => {
    const reset = timeInput ? new Date(timeInput).getTime() : null
    setShowModal(false)
    triggerLimit(reset)
    if ('Notification' in window) Notification.requestPermission()
  }

  return (
    <>
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {countdown && (
          <span className="text-[10px] font-bold text-[#f80]">⏱ {countdown}</span>
        )}
        <button
          onClick={() => { setTimeInput(getDefaultTime()); setShowModal(true) }}
          className="px-2 py-1 text-[10px] font-bold bg-[#1a0800] border border-[#f80] text-[#f80] rounded hover:bg-[#2a1000] transition-colors"
        >
          ⚠️ 한도 소진
        </button>
        {limitHit && (
          <button
            onClick={resumeLimit}
            className="px-2 py-1 text-[10px] font-bold bg-[#001a00] border border-[#0f0] text-[#0f0] rounded"
          >
            ✅ 재설정
          </button>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1829] border-2 border-[#f80] rounded-lg p-6 w-full max-w-sm">
            <div className="text-2xl text-center mb-2">⚠️</div>
            <h2 className="text-base font-bold text-[#f80] text-center mb-1">PLAN LIMIT</h2>
            <p className="text-xs text-[#6b8cbb] text-center mb-4">
              재설정 시각을 입력하면 자동으로 카운트다운하고<br/>시각이 되면 직원들이 자동 복귀해요.
            </p>
            <div className="mb-4">
              <label className="text-xs text-[#6b8cbb] mb-1 block">재설정 예정 시각</label>
              <input
                type="datetime-local"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#050810] border border-[#f80] text-[#f80] text-sm rounded outline-none"
              />
            </div>
            <p className="text-xs text-[#6b8cbb] text-center mb-4">
              💡 Claude Pro: 매일 오전 9시(KST) 재설정
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmLimit}
                className="flex-1 py-2.5 text-xs font-bold bg-[#1a0800] border-2 border-[#f80] text-[#f80] rounded"
              >
                ⏱ 카운트다운 시작
              </button>
              <button
                onClick={() => { setShowModal(false); triggerLimit(null) }}
                className="flex-1 py-2.5 text-xs font-bold bg-[#0a0e1a] border border-[#6b8cbb] text-[#6b8cbb] rounded"
              >
                시각 모름 — 그냥 정지
              </button>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-2 py-1.5 text-xs text-[#6b8cbb] border border-[#1e3a5f] rounded"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  )
}
