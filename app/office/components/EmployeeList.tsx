// components/EmployeeList.tsx — 29명 부서별 직원 목록
'use client'

import { useState } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { EMPLOYEES, getEmployeesByDept, STATUS_COLORS, DEPT_COLORS } from '../data/employees'

export function EmployeeList() {
  const empStates = useOfficeStore((s) => s.empStates)
  const setEmpBubble = useOfficeStore((s) => s.setEmpBubble)
  const addLog = useOfficeStore((s) => s.addLog)
  const [filter, setFilter] = useState<string>('all')

  const deptGroups = getEmployeesByDept()
  const deptNames = Array.from(deptGroups.keys())

  // 상태 집계
  const counts = { total: EMPLOYEES.length, idle: 0, work: 0, done: 0, boss: 0, link: 0 }
  for (const emp of EMPLOYEES) {
    const st = empStates[emp.id]?.status ?? 'idle'
    counts[st]++
  }

  const handleEmpClick = (emp: typeof EMPLOYEES[0]) => {
    setEmpBubble(emp.id, emp.speech, 300)
    addLog('employee', `[${emp.dept}] ${emp.name}: ${emp.speech}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 상단 요약 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#4af]">👥 직원 {counts.total}명</h2>
        <div className="flex gap-1.5">
          {Object.entries(STATUS_COLORS).map(([key, v]) => {
            const c = counts[key as keyof typeof counts]
            if (typeof c !== 'number') return null
            return (
              <span key={key} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                background: `${v.text}20`, color: v.text,
              }}>
                {v.label} {c}
              </span>
            )
          })}
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-1 flex-wrap">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="전체" color="#4af" />
        {deptNames.map(dept => (
          <FilterBtn
            key={dept}
            active={filter === dept}
            onClick={() => setFilter(dept)}
            label={`${dept} (${deptGroups.get(dept)?.length})`}
            color={DEPT_COLORS[dept] ?? '#6b8cbb'}
          />
        ))}
      </div>

      {/* 부서별 목록 */}
      {deptNames.map(dept => {
        if (filter !== 'all' && filter !== dept) return null
        const members = deptGroups.get(dept)!
        return (
          <div key={dept} className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg overflow-hidden">
            {/* 부서 헤더 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e3a5f]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DEPT_COLORS[dept] }} />
              <span className="text-xs font-bold text-white">{dept}</span>
              <span className="text-[10px] text-[#6b8cbb]">{members.length}명</span>
              <span className="text-[10px] text-[#4a6fa5] ml-auto">
                {members[0]?.code}
              </span>
            </div>

            {/* 직원 카드 */}
            <div className="divide-y divide-[#1e3a5f]/50">
              {members.map(emp => {
                const st = empStates[emp.id]
                const status = st?.status ?? 'idle'
                const sc = STATUS_COLORS[status]

                return (
                  <button
                    key={emp.id}
                    onClick={() => handleEmpClick(emp)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#0d1f30] transition-colors text-left"
                  >
                    {/* 아바타 */}
                    <div className="relative shrink-0">
                      <span className="text-xl">{emp.emoji}</span>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0a1628]"
                        style={{ background: sc?.text ?? '#6b8cbb' }}
                      />
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{emp.name}</span>
                        {emp.role === '팀장' || emp.role === '수석비서' ? (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{
                            background: `${DEPT_COLORS[emp.dept]}30`,
                            color: DEPT_COLORS[emp.dept],
                          }}>
                            {emp.role}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#4a6fa5]">{emp.role}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#6b8cbb] truncate">
                        {st?.bubble && st.bubbleTimer > 0 ? st.bubble : emp.speech}
                      </div>
                    </div>

                    {/* 상태 */}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{
                      background: sc?.bg, color: sc?.text,
                    }}>
                      {sc?.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FilterBtn({ active, onClick, label, color }: {
  active: boolean; onClick: () => void; label: string; color: string
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-[10px] font-semibold rounded border transition-colors"
      style={{
        background: active ? `${color}20` : 'transparent',
        borderColor: active ? color : '#1e3a5f',
        color: active ? color : '#6b8cbb',
      }}
    >
      {label}
    </button>
  )
}
