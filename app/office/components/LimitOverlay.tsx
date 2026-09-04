// components/LimitOverlay.tsx — 한도 소진 전체 화면 오버레이
'use client'

import { useOfficeStore } from '../store/officeStore'

export function LimitOverlay() {
  const { scenarioStep, limitResetTime, resumeLimit } = useOfficeStore()

  const STEPS = [
    '① 출근', '② 시장조사', '③ 문의접수', '④ 기획',
    '⑤ 검수', '⑥ TOP 정리', '⑦ 대표 승인', '⑧ 개발',
    '⑨ 런칭', '⑩ 고객소통', '⑪ 정산', '⑫ 회고+브리핑',
  ]

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1829] border-2 border-[#f80] rounded-lg p-7 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-black text-[#f80] mb-2">PLAN LIMIT</h2>
        <p className="text-sm text-[#e2e8f0] mb-1">Claude 플랜 한도가 소진됐어요.</p>
        <p className="text-xs text-[#6b8cbb] mb-4">
          전 직원 🟣 연동 대기 전환됨<br/>
          한도 재설정 후 이어서 진행됩니다.
        </p>

        {scenarioStep >= 0 && (
          <div className="bg-[#1a0800] border border-[#f80] rounded px-3 py-2 mb-5 text-xs text-[#f7b]">
            📋 중단 시점: {STEPS[scenarioStep] ?? '시작 전'}
          </div>
        )}

        {limitResetTime && (
          <p className="text-xs text-[#6b8cbb] mb-4">
            재설정 예정: {new Date(limitResetTime).toLocaleTimeString('ko-KR')}
          </p>
        )}

        <button
          onClick={resumeLimit}
          className="w-full py-3 bg-[#001a00] border-2 border-[#0f0] text-[#0f0] font-bold text-sm rounded mb-2"
        >
          ✅ 한도 재설정됨 — 재개
        </button>
        <p className="text-xs text-[#4a6fa5]">
          한도는 매일 오전 9시 또는 플랜 업그레이드 시 재설정됩니다.
        </p>
      </div>
    </div>
  )
}
