// hooks/useOfficeDb.ts
// Supabase DB로 AI COMPANY 상태 실시간 동기화
// (기존 HTML의 claude.use('db') 역할을 Supabase가 대체)

'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOfficeStore } from '../store/officeStore'

const OFFICE_TABLE = 'office_state' // Supabase에 생성할 테이블

export function useOfficeDb() {
  const { chatLog, setChatLog, scenarioStep, waitingApproval, pipeline } = useOfficeStore()
  const supabase = createClient()
  const isSyncing = useRef(false)

  // ── 실시간 구독 (다른 기기에서 변경 시 자동 반영)
  useEffect(() => {
    const channel = supabase
      .channel('office-state-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: OFFICE_TABLE,
      }, (payload) => {
        if (isSyncing.current) return
        const data = payload.new as Record<string, unknown>

        // 채팅 로그 동기화
        if (data.chat_log) {
          setChatLog(JSON.parse(data.chat_log as string))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── 채팅 로그 저장 (디바운스)
  const saveChatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveChatTimer.current) clearTimeout(saveChatTimer.current)
    saveChatTimer.current = setTimeout(async () => {
      isSyncing.current = true
      await supabase.from(OFFICE_TABLE).upsert({
        id: 'main',
        chat_log: JSON.stringify(chatLog.slice(-40)),
        updated_at: new Date().toISOString(),
      })
      isSyncing.current = false
    }, 500)
  }, [chatLog])

  // ── 시나리오 상태 저장
  useEffect(() => {
    supabase.from(OFFICE_TABLE).upsert({
      id: 'main',
      scenario_step: scenarioStep,
      waiting_approval: waitingApproval,
      updated_at: new Date().toISOString(),
    }).then(() => {})
  }, [scenarioStep, waitingApproval])

  // ── 파이프라인 상태 저장
  useEffect(() => {
    if (!pipeline.currentRepo) return
    supabase.from(OFFICE_TABLE).upsert({
      id: 'main',
      pipeline: JSON.stringify({
        currentRepo: pipeline.currentRepo,
        step: pipeline.step,
        stopped: pipeline.stopped,
        scanSummary: pipeline.scanResult?.summary,
        improvements: pipeline.scanResult?.improvements,
        selectedItems: pipeline.selectedItems,
        buildResult: pipeline.buildResult?.slice(0, 8000),
        retroResult: pipeline.retroResult?.slice(0, 4000),
        guardPassed: pipeline.guardResult?.passed,
        guardSummary: pipeline.guardResult?.summary,
        savedAt: Date.now(),
      }),
      updated_at: new Date().toISOString(),
    }).then(() => {})
  }, [pipeline.step, pipeline.stopped])
}
