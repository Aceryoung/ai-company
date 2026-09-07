// app/office/page.tsx
// QuickBizLab AI COMPANY — 메인 페이지

'use client'

import { useState, useCallback, useRef } from 'react'
import { OfficeCanvas } from './components/OfficeCanvas'
import { Dashboard } from './components/Dashboard'
import { EmployeeList } from './components/EmployeeList'
import { Scenario } from './components/Scenario'
import { Pipeline } from './components/Pipeline'
import { CommandPanel } from './components/CommandPanel'
import { Secretary } from './components/Secretary'
import { LimitOverlay } from './components/LimitOverlay'
import { LimitTimerBar } from './components/LimitTimerBar'
import { UsageMeter } from './components/UsageMeter'
import { useOfficeStore } from './store/officeStore'
import { useClaudeLimit } from './hooks/useClaudeLimit'
import { useSupabaseData } from './hooks/useSupabaseData'
import { useBackgroundWorker } from './hooks/useBackgroundWorker'
import { cn } from '@/lib/utils'

type TabId = 'office' | 'dashboard' | 'employees' | 'scenario' | 'pipeline' | 'command'

const TABS: { id: TabId; label: string }[] = [
  { id: 'office',    label: '🏢 사무실' },
  { id: 'dashboard', label: '📊 대시보드' },
  { id: 'employees', label: '👥 직원 49명' },
  { id: 'scenario',  label: '📋 시나리오' },
  { id: 'pipeline',  label: '🔄 파이프라인' },
  { id: 'command',   label: '💬 지시창' },
]

export default function OfficePage() {
  const [activeTab, setActiveTab] = useState<TabId>('office')
  const { limitHit, triggerLimit, resumeLimit, bgWorkerEnabled, setBgWorkerEnabled, taskMemories } = useOfficeStore()
  const [showMemories, setShowMemories] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(288) // 기본 w-72 = 288px
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.max(240, Math.min(600, newWidth)))
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  // Supabase 실데이터 연동
  useSupabaseData()

  // Phase 3: 백그라운드 워커
  useBackgroundWorker()

  // 크롬 확장 한도 감지 연동
  useClaudeLimit({
    onLimitHit: (resetTime) => {
      triggerLimit(resetTime)
    },
    onLimitResolved: () => {
      resumeLimit()
    },
  })

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] text-[#e2e8f0] overflow-hidden">

      {/* 헤더 */}
      <header className="flex items-center gap-2 px-3 py-2 bg-[#050810] border-b-2 border-[#1e3a5f] shrink-0 min-h-[44px]">
        <span className="text-sm font-black text-[#4af] tracking-wide whitespace-nowrap">
          ⚡ <span className="text-white">QUICKBIZLAB</span> AI CO.
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#001a00] border border-[#0f0] text-[#0f0] rounded animate-pulse shrink-0">
          ● LIVE
        </span>
        <UsageMeter />
        <LimitTimerBar />
        <button
          onClick={() => setShowMemories(!showMemories)}
          className="ml-auto text-[10px] font-bold px-2 py-1 rounded border border-[#9775fa] text-[#9775fa] bg-[#1a0033] hover:bg-[#2a0055] transition-colors shrink-0"
          title="학습 메모리 — 과거 업무에서 추출된 인사이트"
        >
          🧠 {taskMemories.length}건
        </button>
        <button
          onClick={() => setBgWorkerEnabled(!bgWorkerEnabled)}
          className={cn(
            'ml-auto text-[10px] font-bold px-2 py-1 rounded border transition-colors shrink-0',
            bgWorkerEnabled
              ? 'bg-[#001a00] border-[#0f0] text-[#0f0]'
              : 'bg-[#1a1a00] border-[#666] text-[#888]'
          )}
          title={bgWorkerEnabled ? '백그라운드 워커 ON — 직원들이 자율 업무 수행 중' : '백그라운드 워커 OFF — 클릭하여 활성화'}
        >
          🐝 {bgWorkerEnabled ? '자율근무 ON' : '자율근무 OFF'}
        </button>
      </header>

      {/* 탭 */}
      <nav className="flex bg-[#050810] border-b-2 border-[#1e3a5f] overflow-x-auto shrink-0 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors',
              'flex',
              activeTab === tab.id
                ? 'text-[#4af] border-[#4af]'
                : 'text-[#6b8cbb] border-transparent hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 본문 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-hidden">

          {activeTab === 'office' && (
            <div className="h-full overflow-auto bg-[#050810]">
              <OfficeCanvas />
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="h-full overflow-y-auto p-3 flex flex-col gap-3">
              <Dashboard />
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="h-full overflow-y-auto p-3">
              <EmployeeList />
            </div>
          )}

          {activeTab === 'scenario' && (
            <div className="h-full overflow-y-auto p-3 flex flex-col gap-3">
              <Scenario />
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="h-full overflow-y-auto p-3 flex flex-col gap-3">
              <Pipeline />
            </div>
          )}

          {/* 지시창 탭 (전체화면) */}
          {activeTab === 'command' && (
            <div className="h-full flex flex-col">
              <CommandPanel isMobile onSwitchToOffice={() => setActiveTab('office')} />
            </div>
          )}

        </main>

        {/* 데스크톱 사이드바: 비서 + 지시창 (리사이즈 가능) */}
        <aside className="hidden lg:flex border-l-2 border-[#1e3a5f] bg-[#080c18] flex-col shrink-0 relative" style={{ width: sidebarWidth }}>
          {/* 드래그 핸들 */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#4af] active:bg-[#4af] z-10 transition-colors"
            title="드래그하여 사이드바 크기 조절"
          />
          <div className="p-2 border-b border-[#1e3a5f]">
            <Secretary />
          </div>
          <CommandPanel />
        </aside>

      </div>

      {/* 한도 소진 오버레이 */}
      {limitHit && <LimitOverlay />}

      {/* Phase 4: 메모리 뷰어 모달 */}
      {showMemories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowMemories(false)}>
          <div className="bg-[#0d1520] border border-[#9775fa] rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
              <span className="text-sm font-bold text-[#9775fa]">🧠 학습 메모리 ({taskMemories.length}건)</span>
              <button onClick={() => setShowMemories(false)} className="text-[#6b8cbb] hover:text-[#9775fa] text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {taskMemories.length === 0 ? (
                <p className="text-xs text-[#6b8cbb] italic">아직 학습된 메모리가 없습니다. 업무를 수행하면 자동으로 인사이트가 저장됩니다.</p>
              ) : (
                [...taskMemories].reverse().map(m => (
                  <div key={m.id} className="border border-[#1e3a5f] rounded p-3 bg-[#080c18]">
                    <div className="text-[10px] text-[#6b8cbb] mb-1">
                      {new Date(m.createdAt).toLocaleString('ko-KR')} · {m.depts.join(', ')}
                    </div>
                    <div className="text-xs text-[#4af] font-bold mb-1.5">&quot;{m.command}&quot;</div>
                    <div className="flex flex-col gap-1">
                      {m.learnings.map((l, i) => (
                        <div key={i} className="text-[11px] text-[#e2e8f0]">💡 {l}</div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.keywords.map((k, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-[#9775fa20] text-[#9775fa] rounded border border-[#9775fa40]">{k}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
