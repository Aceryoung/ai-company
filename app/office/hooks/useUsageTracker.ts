// hooks/useUsageTracker.ts — 멀티디바이스 사용량 추적
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UsageStats {
  hourly: number      // 최근 1시간
  daily: number       // 오늘 (KST 기준)
  weekly: number      // 이번 주 (월~일)
  lastDevice: string  // 마지막 사용 디바이스
  recentActions: UsageLog[]
}

interface UsageLog {
  id: number
  device: string
  action: string
  detail: string | null
  created_at: string
}

// 디바이스 감지
function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod|android.*mobile/.test(ua)) return 'mobile'
  if (/android|tablet/.test(ua)) return 'tablet'
  // 화면 크기로 노트북/데스크톱 구분 (대략)
  if (typeof screen !== 'undefined' && screen.width <= 1440) return 'laptop'
  return 'desktop'
}

// KST 오늘 시작 시각
function todayStartKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const dateStr = kst.toISOString().slice(0, 10)
  // KST 자정 = UTC 전날 15:00
  return new Date(dateStr + 'T00:00:00+09:00').toISOString()
}

// 이번 주 월요일 시작
function weekStartKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  kst.setUTCDate(kst.getUTCDate() - diff)
  const dateStr = kst.toISOString().slice(0, 10)
  return new Date(dateStr + 'T00:00:00+09:00').toISOString()
}

// 한도 기본값 (Claude Pro 기준 추정)
export const LIMITS = {
  hourly: 45,    // ~45 messages / 5 hours → 9/hour 이지만 넉넉하게
  daily: 200,    // 하루 대략 200회
  weekly: 1000,  // 주간 1000회
}

export function useUsageTracker() {
  const [stats, setStats] = useState<UsageStats>({
    hourly: 0, daily: 0, weekly: 0,
    lastDevice: detectDevice(),
    recentActions: [],
  })
  const [loading, setLoading] = useState(true)
  const deviceRef = useRef(detectDevice())

  // 통계 조회
  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient()
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const todayStart = todayStartKST()
      const weekStart = weekStartKST()

      // 병렬 조회
      const [hourlyRes, dailyRes, weeklyRes, recentRes] = await Promise.all([
        supabase.from('office_usage').select('id', { count: 'exact', head: true })
          .gte('created_at', hourAgo),
        supabase.from('office_usage').select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart),
        supabase.from('office_usage').select('id', { count: 'exact', head: true })
          .gte('created_at', weekStart),
        supabase.from('office_usage').select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setStats({
        hourly: hourlyRes.count ?? 0,
        daily: dailyRes.count ?? 0,
        weekly: weeklyRes.count ?? 0,
        lastDevice: deviceRef.current,
        recentActions: (recentRes.data ?? []) as UsageLog[],
      })
    } catch (e) {
      console.warn('Usage fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // 사용량 기록
  const logUsage = useCallback(async (action: string, detail?: string) => {
    try {
      const supabase = createClient()
      await supabase.from('office_usage').insert({
        device: deviceRef.current,
        action,
        detail: detail ?? null,
      })
      // 즉시 로컬 카운트 증가
      setStats(prev => ({
        ...prev,
        hourly: prev.hourly + 1,
        daily: prev.daily + 1,
        weekly: prev.weekly + 1,
      }))
    } catch (e) {
      console.warn('Usage log failed:', e)
    }
  }, [])

  // 초기 로드 + 30초마다 갱신
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30_000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return { stats, loading, logUsage, refresh: fetchStats }
}
