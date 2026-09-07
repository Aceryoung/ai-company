// app/office/components/Documents.tsx — 문서함 (보고서 아카이브)
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Report {
  id: string
  employee_name: string
  dept: string
  title: string
  content?: string
  created_at: string
}

const DEPT_COLORS: Record<string, string> = {
  시장조사: '#e03131', 영업: '#f76707', 기획: '#f59f00', 검수: '#2f9e44',
  개발: '#1c7ed6', 배포: '#7048e8', 고객소통: '#e64980', 정산: '#20c997',
  회고: '#be4bdb', 운영: '#868e96', 비서: '#4dabf7', 레포: '#74c0fc',
  채용: '#ff922b', 경영: '#ffd43b', 마케팅: '#ff6b6b',
}

export function Documents() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Report | null>(null)
  const [filter, setFilter] = useState<string>('전체')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employee-reports')
      const data = await res.json()
      if (Array.isArray(data)) setReports(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const openReport = async (id: string) => {
    try {
      const res = await fetch(`/api/employee-reports?id=${id}`)
      const data = await res.json() as Report
      if (data.id) setSelected(data)
    } catch { /* ignore */ }
  }

  const depts = ['전체', ...new Set(reports.map(r => r.dept))]
  const filtered = filter === '전체' ? reports : reports.filter(r => r.dept === filter)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e3a5f] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#4af]">📂 문서함</span>
          <span className="text-[10px] text-[#6b8cbb]">{reports.length}건</span>
        </div>
        <button
          onClick={fetchReports}
          className="text-[10px] px-2 py-0.5 rounded border border-[#1e3a5f] text-[#6b8cbb] hover:border-[#4af] hover:text-[#4af] transition-colors"
        >
          🔄 새로고침
        </button>
      </div>

      {/* 부서 필터 */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-[#1e3a5f] shrink-0 overflow-x-auto scrollbar-none">
        {depts.map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap transition-colors ${
              filter === d
                ? 'bg-[#4af] text-black'
                : 'bg-[#0a0e1a] border border-[#1e3a5f] text-[#6b8cbb] hover:border-[#4af]'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* 보고서 목록 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="text-xs text-[#6b8cbb] italic text-center py-8">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-[#6b8cbb] italic text-center py-8">
            {filter === '전체' ? '아직 작성된 보고서가 없습니다.' : `${filter} 부서 보고서가 없습니다.`}
            <br />
            <span className="text-[#4a6fa5]">직원에게 &quot;보고서 작성해줘&quot;, &quot;분석해줘&quot; 등으로 요청하면 보고서가 자동 생성됩니다.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => openReport(r.id)}
                className="text-left p-3 rounded-lg border border-[#1e3a5f] bg-[#080c18] hover:border-[#4af] hover:bg-[#0d1520] transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#e2e8f0] truncate group-hover:text-[#4af] transition-colors">
                      📄 {r.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: (DEPT_COLORS[r.dept] || '#666') + '30', color: DEPT_COLORS[r.dept] || '#6b8cbb' }}
                      >
                        {r.dept}
                      </span>
                      <span className="text-[10px] text-[#6b8cbb]">{r.employee_name}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-[#4a6fa5] whitespace-nowrap shrink-0">
                    {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 보고서 상세 모달 */}
      {selected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="bg-[#0d1520] border border-[#1e3a5f] rounded-lg max-w-lg w-full max-h-[85%] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f] shrink-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#4af] truncate">📄 {selected.title}</div>
                <div className="text-[10px] text-[#6b8cbb]">
                  {selected.employee_name} · {selected.dept} · {new Date(selected.created_at).toLocaleString('ko-KR')}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#6b8cbb] hover:text-[#4af] text-lg ml-2 shrink-0">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-[#e2e8f0] leading-relaxed whitespace-pre-wrap">
              {selected.content || '내용을 불러오는 중...'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
