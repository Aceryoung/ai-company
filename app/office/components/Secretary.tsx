// components/Secretary.tsx — 개인비서 패널 (일정 + 주간정리)
'use client'

import { useState, useCallback, useEffect } from 'react'

interface CalendarEvent {
  title: string
  start: string
  end: string
  location?: string
}

interface RepoSummary {
  name: string
  commits: Array<{ sha: string; message: string; date: string }>
  prsCreated: Array<{ number: number; title: string; state: string; url: string }>
  prsMerged: Array<{ number: number; title: string; mergedAt: string }>
  issuesClosed: Array<{ number: number; title: string }>
}

interface WeeklySummary {
  period: string
  repos: RepoSummary[]
  totals: { commits: number; prsCreated: number; prsMerged: number; issuesClosed: number }
}

async function secretaryAPI(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch('/api/secretary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  })
  return res.json()
}

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function Secretary() {
  const [tab, setTab] = useState<'today' | 'weekly'>('today')
  const [loading, setLoading] = useState(false)
  const [schedule, setSchedule] = useState<{ events: CalendarEvent[]; error?: string } | null>(null)
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)

  // 캘린더 연결 상태 확인
  useEffect(() => {
    secretaryAPI('status').then((data: { connected?: boolean }) => {
      setCalendarConnected(data.connected ?? false)
    }).catch(() => setCalendarConnected(false))
  }, [])

  // URL에 ?calendar=connected가 있으면 연결 완료 표시
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('calendar=connected')) {
      setCalendarConnected(true)
      // URL 정리
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const loadToday = useCallback(async () => {
    setLoading(true)
    try {
      const data = await secretaryAPI('today')
      setSchedule(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWeekly = useCallback(async () => {
    setLoading(true)
    try {
      const data = await secretaryAPI('weekly')
      setWeekly(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleTabChange = (newTab: 'today' | 'weekly') => {
    setTab(newTab)
    if (newTab === 'today' && !schedule) loadToday()
    if (newTab === 'weekly' && !weekly) loadWeekly()
  }

  return (
    <div className="bg-[#0a1929] border border-[#1e3a5f] rounded-xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#0d2040] transition-colors"
      >
        <span className="text-sm">🤵</span>
        <span className="text-xs font-bold text-white flex-1">개인비서</span>
        <span className="text-[10px] text-[#6b8cbb]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {/* 탭 */}
          <div className="flex gap-1 mb-2">
            {(['today', 'weekly'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`flex-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                  tab === t
                    ? 'bg-[#1a3a5f] text-white'
                    : 'text-[#6b8cbb] hover:text-white hover:bg-[#0d2040]'
                }`}
              >
                {t === 'today' ? '📅 오늘 일정' : '📊 주간 정리'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center text-[10px] text-[#6b8cbb] py-4 animate-pulse">
              ⏳ 조회 중...
            </div>
          )}

          {/* 오늘 일정 탭 */}
          {tab === 'today' && !loading && (
            <div className="space-y-1.5">
              {calendarConnected === false ? (
                <a
                  href="/api/secretary/auth"
                  className="block w-full py-3 text-center text-[10px] text-[#4af] border border-[#1e3a5f] rounded hover:bg-[#0d2040] transition-colors"
                >
                  🔗 Google Calendar 연결하기
                </a>
              ) : !schedule ? (
                <button
                  onClick={loadToday}
                  className="w-full py-3 text-[10px] text-[#4af] border border-[#1e3a5f] rounded hover:bg-[#0d2040] transition-colors"
                >
                  📅 오늘 일정 불러오기
                </button>
              ) : schedule.error ? (
                <div className="text-[10px] text-[#ffa94d] bg-[#1a1000] rounded px-2 py-2 border border-[#ffa94d]/30">
                  ⚠️ {schedule.error}
                </div>
              ) : schedule.events.length === 0 ? (
                <div className="text-[10px] text-[#6b8cbb] text-center py-3">
                  🎉 오늘은 일정이 없습니다
                </div>
              ) : (
                schedule.events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 bg-[#0d1f30] rounded border border-[#1e3a5f]">
                    <span className="text-[9px] text-[#4af] font-mono shrink-0 pt-0.5">
                      {formatTime(ev.start)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-white truncate">{ev.title}</div>
                      {ev.location && (
                        <div className="text-[9px] text-[#6b8cbb]">📍 {ev.location}</div>
                      )}
                    </div>
                    <span className="text-[9px] text-[#6b8cbb] shrink-0">
                      ~{formatTime(ev.end)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 주간 정리 탭 */}
          {tab === 'weekly' && !loading && (
            <div className="space-y-2">
              {!weekly ? (
                <button
                  onClick={loadWeekly}
                  className="w-full py-3 text-[10px] text-[#4af] border border-[#1e3a5f] rounded hover:bg-[#0d2040] transition-colors"
                >
                  📊 주간 정리 불러오기
                </button>
              ) : (
                <>
                  {/* 기간 + 총계 */}
                  <div className="text-[9px] text-[#6b8cbb] flex justify-between">
                    <span>📆 {weekly.period}</span>
                  </div>
                  <div className="flex gap-2 text-center">
                    {[
                      { label: '커밋', value: weekly.totals.commits, color: '#0f0', icon: '💻' },
                      { label: 'PR', value: weekly.totals.prsCreated, color: '#4af', icon: '🔀' },
                      { label: '머지', value: weekly.totals.prsMerged, color: '#9775fa', icon: '✅' },
                      { label: '이슈', value: weekly.totals.issuesClosed, color: '#ffa94d', icon: '🎯' },
                    ].map(s => (
                      <div key={s.label} className="flex-1 bg-[#0d1f30] rounded px-1 py-1.5 border border-[#1e3a5f]">
                        <div className="text-xs">{s.icon}</div>
                        <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[8px] text-[#6b8cbb]">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* 레포별 상세 */}
                  {weekly.repos.map(repo => (
                    <div key={repo.name} className="border border-[#1e3a5f] rounded px-2 py-1.5">
                      <div className="text-[10px] font-bold text-[#4af] mb-1">📦 {repo.name}</div>

                      {repo.commits.length > 0 && (
                        <div className="space-y-0.5 mb-1">
                          {repo.commits.slice(0, 5).map(c => (
                            <div key={c.sha} className="flex items-center gap-1 text-[9px]">
                              <span className="text-[#0f0] font-mono">{c.sha}</span>
                              <span className="text-[#ccc] truncate flex-1">{c.message}</span>
                              <span className="text-[#6b8cbb] shrink-0">{formatDate(c.date)}</span>
                            </div>
                          ))}
                          {repo.commits.length > 5 && (
                            <div className="text-[8px] text-[#6b8cbb]">... +{repo.commits.length - 5}건</div>
                          )}
                        </div>
                      )}

                      {repo.prsCreated.length > 0 && (
                        <div className="space-y-0.5">
                          {repo.prsCreated.map(pr => (
                            <div key={pr.number} className="flex items-center gap-1 text-[9px]">
                              <span className={pr.state === 'open' ? 'text-[#0f0]' : pr.state === 'closed' ? 'text-[#f44]' : 'text-[#9775fa]'}>
                                #{pr.number}
                              </span>
                              <span className="text-[#ccc] truncate flex-1">{pr.title}</span>
                              <span className="text-[8px] px-1 rounded" style={{
                                background: pr.state === 'open' ? '#0f02' : '#f442',
                                color: pr.state === 'open' ? '#0f0' : '#f44',
                              }}>
                                {pr.state}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {repo.commits.length === 0 && repo.prsCreated.length === 0 && (
                        <div className="text-[9px] text-[#6b8cbb]">이번 주 활동 없음</div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
