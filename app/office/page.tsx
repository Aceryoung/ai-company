// app/office/page.tsx
// QuickBizLab AI COMPANY — 메인 페이지

'use client'

import { useState } from 'react'
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
import { cn } from '@/lib/utils'

type TabId = 'office' | 'dashboard' | 'employees' | 'scenario' | 'pipeline' | 'command'

const TABS: { id: TabId; label: string }[] = [
  { id: 'office',    label: '🏢 사무실' },
  { id: 'dashboard', label: '📊 대시보드' },
  { id: 'employees', label: '👥 직원 29명' },
  { id: 'scenario',  label: '📋 시나리오' },
  { id: 'pipeline',  label: '🔄 파이프라인' },
  { id: 'command',   label: '💬 지시창' },  // 모바일 전용
]

export default function OfficePage() {
  const [activeTab, setActiveTab] = useState<TabId>('office')
  const { limitHit, triggerLimit, resumeLimit } = useOfficeStore()

  // Supabase 실데이터 연동
  useSupabaseData()

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
      </header>

      {/* 탭 */}
      <nav className="flex bg-[#050810] border-b-2 border-[#1e3a5f] overflow-x-auto shrink-0 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors',
              tab.id === 'command' ? 'flex lg:hidden' : 'flex',
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

          {/* 모바일 지시창 탭 */}
          {activeTab === 'command' && (
            <div className="h-full flex flex-col">
              <CommandPanel isMobile />
            </div>
          )}

        </main>

        {/* 데스크톱 사이드바: 비서 + 지시창 */}
        <aside className="hidden lg:flex w-72 border-l-2 border-[#1e3a5f] bg-[#080c18] flex-col shrink-0">
          <div className="p-2 border-b border-[#1e3a5f]">
            <Secretary />
          </div>
          <CommandPanel />
        </aside>

      </div>

      {/* 한도 소진 오버레이 */}
      {limitHit && <LimitOverlay />}

    </div>
  )
}
