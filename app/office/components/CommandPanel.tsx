// components/CommandPanel.tsx — 대표 지시창 + 직원 페르소나 채팅
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { EMPLOYEES, DEPT_SKILLS, DEPT_COLORS, getEmployeesByDept } from '../data/employees'
import type { Employee } from '../store/officeStore'
import { useUsageTracker } from '../hooks/useUsageTracker'

const QUICK_CMDS = ['현황 보고', '왜 늦어져?', '회의 소집', '레포 현황', '승인할게', '집중 모드']

// 부서 키워드 매핑
const DEPT_KEYWORDS: Record<string, string[]> = {
  시장조사: ['시장', '트렌드', '조사', '경쟁사', 'scout'],
  영업:     ['영업', '클라이언트', '견적', '문의', 'deal'],
  기획:     ['기획', 'prd', '와이어프레임', '스펙', 'plan'],
  검수:     ['검수', '리뷰', 'qa', '테스트', 'guard'],
  개발:     ['개발', '코딩', '빌드', '구현', 'build', 'dev'],
  배포:     ['배포', '디플로이', 'deploy', 'ship', '런칭'],
  고객소통: ['고객', '피드백', '응대', '소통', 'voice'],
  정산:     ['정산', '매출', '비용', '세금', 'cash'],
  회고:     ['회고', 'retro', '회의록', 'kpt'],
  운영:     ['운영', '서버', '모니터링', '로그', 'ops'],
  비서:     ['비서', '일정', '스케줄', 'aide'],
  레포:     ['레포', 'github', 'git', '커밋', 'repo'],
  채용:     ['채용', '조직', '부서', '인력', '충원', '신설', 'hire', '팀 구성'],
}

interface Props {
  isMobile?: boolean
}


export function CommandPanel({ isMobile }: Props) {
  const { chatLog, addLog, waitingApproval, hydrateChatLog } = useOfficeStore()
  const selectedEmployee = useOfficeStore((s) => s.selectedEmployee)
  const setSelectedEmployee = useOfficeStore((s) => s.setSelectedEmployee)
  const chatHistories = useOfficeStore((s) => s.employeeChatHistories)
  const chatSummaries = useOfficeStore((s) => s.employeeChatSummaries)
  const addChatMsg = useOfficeStore((s) => s.addEmployeeChatMsg)
  const setSummary = useOfficeStore((s) => s.setEmployeeChatSummary)
  const { logUsage } = useUsageTracker()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summarized, setSummarized] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [meetingMode, setMeetingMode] = useState(false)
  const [meetingHistory, setMeetingHistory] = useState<string[]>([])  // 회의 맥락 유지
  const [viewingReport, setViewingReport] = useState<{
    id: string; title: string; content: string; employee_name: string; dept: string; created_at: string
  } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // 마운트 후 localStorage 복원
  useEffect(() => {
    hydrateChatLog()
    setMounted(true)
  }, [hydrateChatLog])

  // 보고서 보기
  const openReport = useCallback(async (reportId: string) => {
    try {
      const res = await fetch(`/api/employee-reports?id=${reportId}`)
      const data = await res.json() as {
        id: string; title: string; content: string; employee_name: string; dept: string; created_at: string
      }
      if (data.id) setViewingReport(data)
    } catch { addLog('sys', '⚠️ 보고서를 불러오지 못했습니다.') }
  }, [addLog])

  // 현재 선택된 직원의 히스토리
  const chatHistory = selectedEmployee ? (chatHistories[selectedEmployee.id] ?? []) : []

  // 직원 선택 시 — 이전 대화가 있고 요약이 없으면 자동 요약
  useEffect(() => {
    if (!selectedEmployee) return
    const empId = selectedEmployee.id
    const history = chatHistories[empId]
    if (!history || history.length < 4) return // 4개 미만이면 요약 불필요
    if (chatSummaries[empId]) return // 이미 요약 있음
    if (summarized.has(empId)) return // 이미 요약 시도함

    setSummarized(prev => new Set(prev).add(empId))

    // 백그라운드 요약 요청
    fetch('/api/employee-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'summarize',
        employeeId: empId,
        employeeName: selectedEmployee.name,
        dept: selectedEmployee.dept,
        role: selectedEmployee.role,
        speech: selectedEmployee.speech,
        message: '',
        history,
      }),
    })
      .then(res => res.json())
      .then((data: { summary?: string }) => {
        if (data.summary) {
          setSummary(empId, data.summary)
          addLog('sys', `📝 ${selectedEmployee.name}과의 이전 대화가 요약되었습니다.`)
        }
      })
      .catch(() => { /* ignore */ })
  }, [selectedEmployee?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [chatLog])

  // 직원 페르소나 채팅
  const sendToEmployee = useCallback(async (message: string) => {
    if (!selectedEmployee || isLoading) return

    addLog('boss', message)
    addChatMsg(selectedEmployee.id, { role: 'user', content: message })
    setIsLoading(true)

    try {
      const currentHistory = chatHistories[selectedEmployee.id] ?? []
      const previousSummary = chatSummaries[selectedEmployee.id] || undefined
      const res = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          employeeName: selectedEmployee.name,
          dept: selectedEmployee.dept,
          role: selectedEmployee.role,
          speech: selectedEmployee.speech,
          message,
          history: currentHistory,
          previousSummary,
        }),
      })

      const data = await res.json() as {
        reply: string; model?: string
        report?: { id: string; title: string } | null
      }
      const reply = data.reply

      if (data.model === 'gemini') {
        addLog('sys', '🟡 Claude 한도 소진 → Gemini Flash로 전환됨')
      }

      addLog('employee', `[${selectedEmployee.dept}] ${selectedEmployee.name}: ${reply}`)
      addChatMsg(selectedEmployee.id, { role: 'assistant', content: reply })

      // 보고서 생성 알림
      if (data.report) {
        const rpt = data.report
        addLog('sys', `📄 보고서 "${rpt.title}" 작성 완료! [REPORT:${rpt.id}]`)
      }
    } catch {
      addLog('sys', '⚠️ 응답을 받지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEmployee, isLoading, chatHistories, chatSummaries, addLog, addChatMsg])

  const addDynamicEmployees = useOfficeStore((s) => s.addDynamicEmployees)
  const dynamicEmployees = useOfficeStore((s) => s.dynamicEmployees)

  // 부서 생성 키워드 감지
  const detectDeptCreation = (text: string): string | null => {
    const patterns = [
      /(.+?)\s*(?:부서|팀)\s*(?:만들|신설|생성|창설|세팅|구성)/,
      /(?:만들|신설|생성|창설|세팅|구성).*?(.+?)\s*(?:부서|팀)/,
    ]
    for (const p of patterns) {
      const m = text.match(p)
      if (m) return m[1].trim()
    }
    return null
  }

  // 부서 생성 실행
  const createDepartment = useCallback(async (deptName: string, context: string) => {
    addLog('sys', `🏗️ "${deptName}" 부서를 사무실에 생성하는 중...`)

    try {
      const res = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-dept',
          message: deptName,
          previousSummary: context,
          employeeId: '', employeeName: '', dept: '', role: '', speech: '',
        }),
      })
      const data = await res.json() as {
        employees?: Array<{ name: string; role: string; speech: string; emoji: string }>
        deptName?: string
        error?: string
      }

      if (!data.employees || data.employees.length === 0) {
        addLog('sys', `⚠️ 부서 생성 실패: ${data.error || '알 수 없는 오류'}`)
        return
      }

      // 부서 색상 생성 (기존에 없으면 랜덤)
      const colors = ['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#4dabf7','#9775fa','#e599f7','#20c997','#f06595','#74c0fc','#ff922b']
      const deptColor = DEPT_COLORS[deptName] || colors[Math.floor(Math.random() * colors.length)]

      // 기존 직원 수 기반으로 ID 및 좌석 행 계산
      const baseIdx = EMPLOYEES.length + dynamicEmployees.length
      // 동적 직원의 좌석은 seatPosition 폴백이 자동 배치하므로
      // homeX/homeY는 데이터 정합성용으로만 설정
      const existingDynDepts = new Set(dynamicEmployees.map(e => e.dept))
      const deptRowIdx = existingDynDepts.size  // 이 부서가 몇 번째 동적 부서인지
      const newEmployees: Employee[] = data.employees.map((e, i) => ({
        id: `D${String(baseIdx + i + 1).padStart(2, '0')}`,
        name: e.name,
        code: `${deptName.toUpperCase().slice(0, 3)}_${i + 1}`,
        role: e.role,
        dept: deptName,
        deptColor,
        speech: e.speech,
        emoji: e.emoji,
        homeX: 1 + i * 2,
        homeY: 13 + deptRowIdx * 2,   // 부서별로 행 분리
      }))

      addDynamicEmployees(newEmployees)

      // 부서 생성 완료 메시지
      addLog('sys', `✅ "${deptName}" 부서가 신설되었습니다!`)
      for (const emp of newEmployees) {
        await new Promise(r => setTimeout(r, 300))
        addLog('employee', `[${deptName}] ${emp.emoji} ${emp.name}(${emp.role}): ${emp.speech}`)
      }
      addLog('sys', `🎉 ${deptName} 부서 ${newEmployees.length}명 배치 완료! 사무실에서 확인하세요.`)
    } catch {
      addLog('sys', '⚠️ 부서 생성 중 오류가 발생했습니다.')
    }
  }, [addLog, addDynamicEmployees, dynamicEmployees])

  // 팀장 회의 진행
  const startMeeting = useCallback(async (agenda: string) => {
    if (isLoading) return
    setIsLoading(true)
    addLog('boss', agenda)

    const isFirst = meetingHistory.length === 0
    if (isFirst) {
      addLog('sys', '🏛️ 팀장 회의를 시작합니다. 관련 팀장들이 발언합니다...')
    }

    // 회의 히스토리에 추가
    const updatedHistory = [...meetingHistory, `대표님: ${agenda}`]

    try {
      const res = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'meeting',
          message: agenda,
          employeeId: '', employeeName: '', dept: '', role: '', speech: '',
          previousSummary: updatedHistory.slice(-10).join('\n'),
        }),
      })
      const data = await res.json() as { replies: string[]; model?: string }

      if (data.model === 'gemini') {
        addLog('sys', '🟡 Claude 한도 소진 → Gemini Flash로 전환됨')
      }

      // 팀장 발언을 순차적으로 표시
      const replyLines: string[] = []
      for (let i = 0; i < data.replies.length; i++) {
        await new Promise(r => setTimeout(r, 400))
        addLog('employee', data.replies[i])
        replyLines.push(data.replies[i])
      }

      // 히스토리 업데이트
      setMeetingHistory([...updatedHistory, ...replyLines])

      // 부서 생성 감지
      const deptToCreate = detectDeptCreation(agenda)
      if (deptToCreate) {
        await createDepartment(deptToCreate, updatedHistory.slice(-5).join('\n'))
      }
    } catch {
      addLog('sys', '⚠️ 회의 진행 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, addLog, meetingHistory, createDepartment])

  const send = (preset?: string) => {
    const cmd = preset ?? input.trim()
    if (!cmd) return
    setInput('')

    // 회의 모드: 안건 입력 → 회의 시작
    if (meetingMode) {
      startMeeting(cmd)
      logUsage('meeting', cmd)
      return
    }

    if (selectedEmployee) {
      sendToEmployee(cmd)
      logUsage('employee-chat', `${selectedEmployee.name}: ${cmd}`)
      return
    }

    addLog('boss', cmd)
    logUsage('command', cmd)
    handleCommand(cmd)
  }

  // 부서 감지
  const detectDept = (text: string): string | null => {
    const lower = text.toLowerCase()
    for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) return dept
    }
    return null
  }

  const handleCommand = (cmd: string) => {
    const lower = cmd.toLowerCase()
    let resp: string | null = null

    if (lower.includes('현황') || lower.includes('보고')) {
      resp = '[AIDE] 이수연: 현황 확인할게요. 잠시만요.'
    } else if (lower.includes('늦')) {
      resp = waitingApproval
        ? '[AIDE] 이수연: 대표님 결재 대기예요. 승인 버튼 눌러주세요!'
        : '[AIDE] 이수연: 지연 없어요. 정상 진행 중이에요.'
    } else if (lower.includes('회의')) {
      setMeetingMode(true)
      resp = '[AIDE] 이수연: 팀장 전원 회의실 소집! 🏛️ 안건을 입력해주세요, 대표님.'
    } else if (lower.includes('승인')) {
      resp = waitingApproval
        ? '[꽁꽁(대표)] 승인!'
        : '[AIDE] 이수연: 현재 승인 대기 안건 없어요.'
    } else if (lower.includes('집중')) {
      resp = '[전원] 집중 모드 ON. 자리로 복귀합니다.'
    } else {
      resp = '[AIDE] 이수연: "현황 보고" "왜 늦어져?" "회의 소집" 또는 부서명/키워드를 입력해주세요.'
    }

    if (resp) setTimeout(() => addLog('employee', resp!), 400)

    // 부서 감지 → 스킬 자동 표시
    const detectedDept = detectDept(cmd)
    if (detectedDept) {
      const skills = DEPT_SKILLS[detectedDept]
      const leader = EMPLOYEES.find(e => e.dept === detectedDept && (e.role === '팀장' || e.role === '수석비서'))
      if (skills && skills.length > 0) {
        setTimeout(() => {
          const skillList = skills.map(s => `${s.icon} ${s.label}`).join(' · ')
          addLog('sys', `🔧 [${detectedDept}] 활성 스킬: ${skillList}`)
          if (leader) {
            addLog('employee', `[${detectedDept}] ${leader.name}: 스킬 준비 완료! 작업 시작합니다.`)
          }
        }, 800)
      }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* 타이틀 — 데스크톱 사이드바만 */}
      {!isMobile && (
        <div className="px-3 py-2.5 text-sm font-bold border-b-2 border-[#1e3a5f] shrink-0 flex items-center justify-between">
          {meetingMode ? (
            <>
              <span className="text-[#ffd43b]">🏛️ 팀장 회의 진행 중</span>
              <button
                onClick={() => { setMeetingMode(false); setMeetingHistory([]) }}
                className="text-[10px] px-2 py-0.5 bg-[#1a2332] text-[#6b8cbb] rounded hover:bg-[#2a3342] hover:text-[#4af] transition-colors"
              >
                ✕ 회의 종료
              </button>
            </>
          ) : selectedEmployee ? (
            <>
              <span style={{ color: selectedEmployee.deptColor }}>
                🗣️ {selectedEmployee.name}과 대화 중
              </span>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-[10px] px-2 py-0.5 bg-[#1a2332] text-[#6b8cbb] rounded hover:bg-[#2a3342] hover:text-[#4af] transition-colors"
              >
                ✕ 나가기
              </button>
            </>
          ) : (
            <span className="text-[#4af]">💬 대표 지시창</span>
          )}
        </div>
      )}

      {/* 직원 정보 바 (대화 모드일 때) */}
      {selectedEmployee && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-[#1e3a5f] shrink-0"
          style={{ background: `${selectedEmployee.deptColor}15` }}
        >
          <span className="text-lg">{selectedEmployee.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#e2e8f0]">
              {selectedEmployee.name}
              <span className="ml-1 font-normal text-[#6b8cbb]">
                {selectedEmployee.dept} · {selectedEmployee.role}
              </span>
            </div>
            <div className="text-[10px] text-[#6b8cbb] truncate">
              &quot;{selectedEmployee.speech}&quot;
            </div>
          </div>
        </div>
      )}

      {/* 이전 대화 요약 표시 */}
      {selectedEmployee && chatSummaries[selectedEmployee.id] && (
        <div className="px-3 py-1.5 border-b border-[#1e3a5f] shrink-0 bg-[#0d1520]">
          <div className="text-[10px] text-[#6b8cbb]">
            📝 이전 대화 요약: <span className="text-[#4af]">{chatSummaries[selectedEmployee.id]}</span>
          </div>
        </div>
      )}

      {/* 퀵버튼 (일반 모드일 때만) */}
      {!selectedEmployee && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-[#1e3a5f] shrink-0">
          {QUICK_CMDS.map((c) => (
            <button
              key={c}
              onClick={() => send(c)}
              className="px-2 py-1 text-[11px] font-semibold bg-[#0a0e1a] border border-[#1e3a5f] text-[#6b8cbb] rounded hover:border-[#4af] hover:text-[#4af] active:border-[#4af] active:text-[#4af] transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 채팅 로그 */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 min-h-0"
      >
        {mounted && chatLog.map((m, i) => {
          // 보고서 링크 감지
          const reportMatch = m.text.match(/\[REPORT:([a-f0-9-]+)\]/)
          return (
            <div
              key={i}
              className={`text-xs leading-relaxed break-words whitespace-pre-wrap ${
                m.type === 'boss' ? 'text-[#4af]'
                : m.type === 'employee' ? 'text-[#6ef]'
                : 'text-[#6b8cbb] italic'
              }`}
            >
              {m.type === 'boss' && <span className="font-bold text-white">꽁꽁(대표): </span>}
              {reportMatch ? (
                <>
                  {m.text.replace(reportMatch[0], '')}
                  <button
                    onClick={() => openReport(reportMatch[1])}
                    className="ml-1 px-2 py-0.5 bg-[#4af] text-black text-[10px] font-bold rounded hover:bg-[#7bf] transition-colors"
                  >
                    📄 보고서 보기
                  </button>
                </>
              ) : m.text}
            </div>
          )
        })}
        {isLoading && (
          <div className="text-xs text-[#6b8cbb] italic animate-pulse">
            {selectedEmployee?.name}이(가) 답변을 작성하는 중…
          </div>
        )}
        {mounted && chatLog.length === 0 && !selectedEmployee && (
          <p className="text-xs text-[#6b8cbb] italic">지시창 대기 중…</p>
        )}
        {mounted && chatLog.length === 0 && selectedEmployee && (
          <p className="text-xs text-[#6b8cbb] italic">
            {selectedEmployee.name}에게 말을 걸어보세요! 🗣️
          </p>
        )}
      </div>

      {/* 보고서 모달 */}
      {viewingReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#0d1520] border border-[#1e3a5f] rounded-lg max-w-md w-full max-h-[80%] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
              <div>
                <div className="text-sm font-bold text-[#4af]">📄 {viewingReport.title}</div>
                <div className="text-[10px] text-[#6b8cbb]">
                  {viewingReport.employee_name} · {viewingReport.dept} · {new Date(viewingReport.created_at).toLocaleString('ko-KR')}
                </div>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="text-[#6b8cbb] hover:text-[#4af] text-lg"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-[#e2e8f0] leading-relaxed whitespace-pre-wrap">
              {viewingReport.content}
            </div>
          </div>
        </div>
      )}

      {/* 입력 */}
      <div className="flex gap-1.5 p-2 border-t-2 border-[#1e3a5f] shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={meetingMode ? '🏛️ 회의 안건 입력…' : selectedEmployee ? `${selectedEmployee.name}에게 말하기…` : '지시 입력…'}
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded outline-none focus:border-[#4af] placeholder:text-[#4a6fa5] disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={isLoading}
          className="px-3 py-2 bg-[#4af] text-black text-xs font-bold rounded hover:bg-[#7bf] transition-colors disabled:opacity-50"
          style={selectedEmployee ? { background: selectedEmployee.deptColor } : undefined}
        >
          {isLoading ? '…' : '전송'}
        </button>
      </div>
    </div>
  )
}
