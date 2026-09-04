// hooks/useClaudeLimit.ts
// 크롬 확장 ↔ AI COMPANY 앱 연동 브리지
// chrome.storage.onChanged로 한도 상태 실시간 수신

'use client'

import { useEffect, useCallback } from 'react'

interface UseClaudeLimitOptions {
  onLimitHit?: (resetTime: number | null) => void
  onLimitResolved?: () => void
}

// chrome 타입 선언 (크롬 확장이 없는 환경 대비)
declare const chrome: {
  storage?: {
    local: {
      get: (keys: string[], cb: (result: Record<string, unknown>) => void) => void
    }
    onChanged: {
      addListener: (cb: (changes: Record<string, { newValue?: unknown }>) => void) => void
      removeListener: (cb: (changes: Record<string, { newValue?: unknown }>) => void) => void
    }
  }
} | undefined

export function useClaudeLimit({ onLimitHit, onLimitResolved }: UseClaudeLimitOptions = {}) {
  const handleLimitHit = useCallback(onLimitHit ?? (() => {}), [onLimitHit])
  const handleResolved = useCallback(onLimitResolved ?? (() => {}), [onLimitResolved])

  useEffect(() => {
    // 크롬 확장 없으면 조용히 skip
    if (typeof chrome === 'undefined' || !chrome?.storage) return

    // 초기 상태 확인 (페이지 로드 시)
    chrome.storage.local.get(['claudeLimitState'], (result) => {
      const state = result.claudeLimitState as { limitHit?: boolean; resetTime?: number } | undefined
      if (state?.limitHit) {
        handleLimitHit(state.resetTime ?? null)
      }
    })

    // 실시간 변화 구독
    const handler = (changes: Record<string, { newValue?: unknown }>) => {
      const broadcast = changes.claudeLimitBroadcast?.newValue as
        | { type: string; resetTime?: number }
        | undefined

      if (!broadcast) return

      if (broadcast.type === 'LIMIT_HIT') {
        handleLimitHit(broadcast.resetTime ?? null)
      }
      if (broadcast.type === 'LIMIT_RESOLVED') {
        handleResolved()
      }
    }

    chrome.storage?.onChanged.addListener(handler)
    return () => chrome.storage?.onChanged.removeListener(handler)
  }, [handleLimitHit, handleResolved])
}
