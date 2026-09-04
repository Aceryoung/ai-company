// components/Dashboard.tsx — 실시간 대시보드 (Supabase 연동)
'use client'

import { useProjects, useTransactions } from '../hooks/useSupabaseData'
import { EMPLOYEES } from '../data/employees'
import { useOfficeStore } from '../store/officeStore'

export function Dashboard() {
  const { data: projects, isLoading: projLoading } = useProjects()
  const { data: transactions, isLoading: txLoading } = useTransactions()
  const empStates = useOfficeStore((s) => s.empStates)
  const scenarioStep = useOfficeStore((s) => s.scenarioStep)

  // ── 프로젝트 통계
  const activeProjects = projects?.filter(p => p.status === 'active').length ?? 0
  const proposalProjects = projects?.filter(p => p.status === 'proposal').length ?? 0
  const completedProjects = projects?.filter(p => p.status === 'completed').length ?? 0
  const totalProjects = projects?.length ?? 0

  // ── 정산 통계
  const totalIncome = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const netProfit = totalIncome - totalExpense

  // ── 직원 상태 통계
  const statusCounts = { idle: 0, work: 0, done: 0, boss: 0, link: 0 }
  for (const emp of EMPLOYEES) {
    const st = empStates[emp.id]?.status ?? 'idle'
    statusCounts[st] = (statusCounts[st] ?? 0) + 1
  }

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n)

  const STEPS = ['출근','시장조사','문의접수','기획','검수','TOP정리','대표승인','개발','런칭','고객소통','정산','회고']

  return (
    <>
      <h2 className="text-sm font-bold text-[#4af]">📊 실시간 대시보드</h2>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiCard
          icon="📂" label="프로젝트"
          value={projLoading ? '…' : String(totalProjects)}
          sub={`진행 ${activeProjects} · 상담 ${proposalProjects} · 완료 ${completedProjects}`}
          accent="#4af"
        />
        <KpiCard
          icon="💰" label="총 매출"
          value={txLoading ? '…' : `${fmt(totalIncome)}원`}
          sub={`매입 ${fmt(totalExpense)}원`}
          accent="#20c997"
        />
        <KpiCard
          icon="📈" label="순이익"
          value={txLoading ? '…' : `${fmt(netProfit)}원`}
          sub={netProfit >= 0 ? '흑자' : '적자'}
          accent={netProfit >= 0 ? '#0f0' : '#f66'}
        />
        <KpiCard
          icon="👥" label="직원 현황"
          value={`${EMPLOYEES.length}명`}
          sub={`작업 ${statusCounts.work} · 완료 ${statusCounts.done} · 대기 ${statusCounts.idle}`}
          accent="#bf5af2"
        />
      </div>

      {/* 직원 상태 바 */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3">
        <h3 className="text-xs font-bold text-[#6b8cbb] mb-2">직원 상태 분포</h3>
        <div className="flex h-4 rounded overflow-hidden">
          {(['work', 'done', 'boss', 'link', 'idle'] as const).map((status) => {
            const count = statusCounts[status]
            if (count === 0) return null
            const colors: Record<string, string> = {
              work: '#0f0', done: '#4af', boss: '#f80', link: '#bf5af2', idle: '#2a3a4a'
            }
            const labels: Record<string, string> = {
              work: '작업중', done: '완료', boss: '보고중', link: '연동대기', idle: '대기'
            }
            return (
              <div
                key={status}
                className="flex items-center justify-center text-[8px] font-bold"
                style={{
                  width: `${(count / EMPLOYEES.length) * 100}%`,
                  background: colors[status],
                  color: status === 'idle' ? '#6b8cbb' : '#000',
                }}
                title={`${labels[status]}: ${count}명`}
              >
                {count > 2 && `${labels[status]} ${count}`}
              </div>
            )
          })}
        </div>
      </div>

      {/* 시나리오 진행 */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3">
        <h3 className="text-xs font-bold text-[#6b8cbb] mb-2">시나리오 진행률</h3>
        <div className="flex gap-0.5">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex-1 py-1 text-center text-[7px] font-bold rounded-sm"
              style={{
                background: i < scenarioStep ? '#001a00' : i === scenarioStep ? '#0a1628' : '#0a0e1a',
                color: i < scenarioStep ? '#0f0' : i === scenarioStep ? '#4af' : '#2a3a4a',
                border: i === scenarioStep ? '1px solid #4af' : '1px solid transparent',
              }}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="text-[10px] text-[#6b8cbb] mt-1.5">
          {scenarioStep < 0 ? '⏸ 시나리오 대기' : `▶ ${scenarioStep + 1}/12 단계 진행 중`}
        </div>
      </div>

      {/* 프로젝트 목록 */}
      {projects && projects.length > 0 && (
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3">
          <h3 className="text-xs font-bold text-[#6b8cbb] mb-2">프로젝트 현황</h3>
          <div className="flex flex-col gap-1">
            {projects.slice(0, 6).map((p) => {
              const statusColors: Record<string, string> = {
                active: '#0f0', proposal: '#4af', completed: '#6b8cbb', settled: '#20c997'
              }
              const statusLabels: Record<string, string> = {
                active: '진행중', proposal: '상담중', completed: '완료', settled: '정산완료'
              }
              return (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColors[p.status] ?? '#6b8cbb' }} />
                  <span className="text-[#e2e8f0] truncate flex-1">{p.name}</span>
                  <span className="text-[10px] shrink-0" style={{ color: statusColors[p.status] }}>
                    {statusLabels[p.status] ?? p.status}
                  </span>
                  {p.estimated_amount && (
                    <span className="text-[10px] text-[#4a6fa5] shrink-0">{fmt(p.estimated_amount)}원</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ── KPI 카드 서브 컴포넌트
function KpiCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-[#6b8cbb]">{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] text-[#4a6fa5] mt-0.5">{sub}</div>
    </div>
  )
}
