// components/CommandPanel.tsx — 대표 지시창 + 직원 페르소나 채팅
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { EMPLOYEES, DEPT_SKILLS, DEPT_COLORS, getEmployeesByDept } from '../data/employees'
import type { Employee, AutonomousTask, TaskStep, SwarmPhase } from '../store/officeStore'
import { useUsageTracker } from '../hooks/useUsageTracker'

const QUICK_CMDS = ['현황 보고', '왜 늦어져?', '회의 소집', '레포 현황', '승인할게', '집중 모드']

// 부서 키워드 매핑
const DEPT_KEYWORDS: Record<string, string[]> = {
  시장조사: ['시장', '트렌드', '조사', '경쟁사', 'scout'],
  영업:     ['영업', '클라이언트', '견적', '문의', 'deal'],
  마케팅:   ['마케팅', '캠페인', '광고', '콘텐츠', '브랜드', 'seo', 'sns', '홍보'],
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
  const activeSession = useOfficeStore((s) => s.activeSession)
  const visitedSessions = useOfficeStore((s) => s.visitedSessions)
  const setActiveSession = useOfficeStore((s) => s.setActiveSession)
  const addSessionLog = useOfficeStore((s) => s.addSessionLog)
  const walkEmpTo = useOfficeStore((s) => s.walkEmpTo)
  const setEmpBubble = useOfficeStore((s) => s.setEmpBubble)
  const setEmpStatus = useOfficeStore((s) => s.setEmpStatus)
  const addTask = useOfficeStore((s) => s.addTask)
  const updateTaskStep = useOfficeStore((s) => s.updateTaskStep)
  const updateSwarmPhase = useOfficeStore((s) => s.updateSwarmPhase)
  const setCurrentPhase = useOfficeStore((s) => s.setCurrentPhase)
  const finishTask = useOfficeStore((s) => s.finishTask)
  const addTaskMemory = useOfficeStore((s) => s.addTaskMemory)
  const getRelevantMemories = useOfficeStore((s) => s.getRelevantMemories)
  const taskMemories = useOfficeStore((s) => s.taskMemories)
  // 회의 상태 (zustand — 탭 전환해도 유지)
  const meetingMode = useOfficeStore((s) => s.meetingMode)
  const setMeetingMode = useOfficeStore((s) => s.setMeetingMode)
  const meetingHistory = useOfficeStore((s) => s.meetingHistory)
  const setMeetingHistory = useOfficeStore((s) => s.setMeetingHistory)
  const meetingLeaderSeats = useOfficeStore((s) => s.meetingLeaderSeats)
  const setMeetingLeaderSeats = useOfficeStore((s) => s.setMeetingLeaderSeats)
  const { logUsage } = useUsageTracker()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summarized, setSummarized] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
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

  // 직원 선택 시 → 해당 부서 세션으로 전환 (캔버스 클릭으로 선택한 경우)
  useEffect(() => {
    if (selectedEmployee) {
      setActiveSession(selectedEmployee.dept)
    }
    // 직원 해제 시에는 세션 자동 전환하지 않음 — 현재 탭 유지
  }, [selectedEmployee?.id, setActiveSession]) // eslint-disable-line react-hooks/exhaustive-deps

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
          ...(selectedEmployee.forceModel ? { forceModel: selectedEmployee.forceModel } : {}),
        }),
      })

      const data = await res.json() as {
        reply: string; model?: string
        report?: { id: string; title: string } | null
      }
      const reply = data.reply

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

  // 부서 생성 키워드 감지 — 부서명만 정확히 추출
  const detectDeptCreation = (text: string): string | null => {
    const patterns = [
      // "마케팅 팀 만들어줘", "마케팅 부서 신설해줘"
      /([가-힣a-zA-Z]{2,6})\s*(?:부서|팀)\s*(?:을|를)?\s*(?:만들|신설|생성|창설|세팅|구성)/,
      // "만들어줘 마케팅 팀"
      /(?:만들|신설|생성|창설|세팅|구성).*?([가-힣a-zA-Z]{2,6})\s*(?:부서|팀)/,
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

  // ── Phase 4: 학습/메모리 ──

  // 완료된 업무에서 학습 추출 & 메모리 저장
  const extractAndSaveLearning = useCallback(async (
    command: string, depts: string[], summary: string
  ) => {
    try {
      const res = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract-learning',
          message: command,
          dept: depts.join(','),
          previousSummary: summary,
          employeeId: '', employeeName: '', role: '', speech: '',
        }),
      })
      const data = await res.json() as { learnings: string[]; keywords: string[] }

      addTaskMemory({
        id: `mem_${Date.now()}`,
        command,
        depts,
        summary: summary.slice(0, 300),
        learnings: data.learnings || [],
        keywords: data.keywords || [],
        createdAt: Date.now(),
      })

      addLog('sys', `🧠 학습 완료 — ${data.learnings.length}개 인사이트 저장 (총 메모리: ${taskMemories.length + 1}건)`)
    } catch {
      // 학습 실패해도 조용히 — 핵심 기능 아님
    }
  }, [addTaskMemory, addLog, taskMemories.length])

  // 관련 과거 메모리를 프롬프트 컨텍스트로 변환
  const getMemoryContext = useCallback((command: string, depts: string[]): string => {
    const memories = getRelevantMemories(command, depts)
    if (memories.length === 0) return ''

    const lines = memories.map(m =>
      `• [${new Date(m.createdAt).toLocaleDateString('ko-KR')}] "${m.command}" → ${m.learnings.join('; ')}`
    )
    return `\n\n■ 과거 업무 기억 (참고):\n${lines.join('\n')}`
  }, [getRelevantMemories])

  // ── 자율 업무 시스템 ──

  // 업무 지시 감지 (업무/과제/작성/분석/만들어/조사/검토 등)
  const TASK_PATTERNS = [
    /(.+?)\s*(?:해줘|해주세요|해 줘|해 주세요|부탁해|부탁합니다)$/,
    /(.+?)\s*(?:작성|분석|조사|검토|준비|기획|설계|개발|배포|테스트|리뷰)\s*(?:해|하세요|해줘|해주세요|부탁)/,
    /(.+?)\s*(?:보고서|리포트|전략|계획|방안)\s*(?:만들|작성|준비)/,
  ]

  const detectTask = (text: string): string | null => {
    // 짧은 인사말이나 질문은 업무가 아님
    if (text.length < 8) return null
    if (/^(안녕|하이|뭐해|현황|보고|승인|집중|회의|늦)/.test(text)) return null
    // 부서 생성은 별도 처리
    if (detectDeptCreation(text)) return null

    for (const p of TASK_PATTERNS) {
      if (p.test(text)) return text
    }
    // "~해줘" 패턴이 아니더라도, 부서 키워드 + 동사가 있으면 업무로 간주
    const hasDeptKeyword = Object.values(DEPT_KEYWORDS).flat().some(k => text.toLowerCase().includes(k))
    const hasActionVerb = /(?:작성|분석|조사|검토|준비|기획|설계|개발|배포|정리|수집|파악|확인|처리)/.test(text)
    if (hasDeptKeyword && hasActionVerb) return text

    return null
  }

  // 업무 관련 부서 감지 (복수 부서 가능)
  const detectTaskDepts = (text: string): string[] => {
    const lower = text.toLowerCase()
    const depts: string[] = []
    for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) depts.push(dept)
    }
    // 부서 키워드 없으면 내용으로 추론
    if (depts.length === 0) {
      if (/전략|마케팅|홍보|브랜드/.test(text)) depts.push('기획', '영업')
      else if (/코드|개발|구현|빌드/.test(text)) depts.push('개발', '검수')
      else if (/고객|피드백|소통/.test(text)) depts.push('고객소통')
      else if (/보고서|리포트|분석/.test(text)) depts.push('기획')
      else depts.push('비서')  // 기본: 비서가 처리
    }
    return [...new Set(depts)]
  }

  // 자율 업무 실행
  const executeAutonomousTask = useCallback(async (command: string) => {
    const targetDepts = detectTaskDepts(command)
    const allEmps = [...EMPLOYEES, ...useOfficeStore.getState().dynamicEmployees]

    // Phase 4: 과거 메모리 조회
    const memoryContext = getMemoryContext(command, targetDepts)
    if (memoryContext) {
      addLog('sys', `🧠 관련 과거 업무 기억 ${useOfficeStore.getState().taskMemories.filter(m => m.depts.some(d => targetDepts.includes(d)) || m.keywords.some(k => command.toLowerCase().includes(k.toLowerCase()))).length}건 참조`)
    }

    // 관련 부서 직원 선택 (팀장 + 관련 팀원 1명 + 레드팀)
    const assignees: Employee[] = []
    for (const dept of targetDepts) {
      const deptEmps = allEmps.filter(e => e.dept === dept)
      const leader = deptEmps.find(e => e.role === '팀장' || e.role === '수석비서')
      const worker = deptEmps.find(e => e.role !== '팀장' && e.role !== '수석비서' && e.role !== '레드팀')
      const red = deptEmps.find(e => e.role === '레드팀')
      if (leader) assignees.push(leader)
      if (worker) assignees.push(worker)
      if (red) assignees.push(red)
    }

    if (assignees.length === 0) {
      addLog('sys', '⚠️ 관련 부서를 찾지 못했습니다.')
      return
    }

    // Task 생성
    const taskId = `task_${Date.now()}`
    const steps: TaskStep[] = assignees.map(emp => ({
      empId: emp.id,
      empName: emp.name,
      dept: emp.dept,
      status: 'pending' as const,
      message: '대기 중...',
    }))

    const task: AutonomousTask = {
      id: taskId,
      command,
      targetDepts,
      steps,
      status: 'working',
      createdAt: Date.now(),
    }
    addTask(task)

    addLog('sys', `🚀 자율 업무 시작 — ${targetDepts.join(', ')} 부서 ${assignees.length}명 투입`)

    // 순차 실행 (각 직원이 자기 파트 수행)
    const results: string[] = []
    let prevResult = ''

    for (const emp of assignees) {
      // 직원 상태 업데이트 (작업 중)
      setEmpStatus(emp.id, 'work', `${command.slice(0, 10)}... 작업 중`)
      setEmpBubble(emp.id, '💼 작업 중...', 999)
      updateTaskStep(taskId, emp.id, { status: 'working', startedAt: Date.now(), message: '작업 수행 중...' })

      addLog('sys', `⏳ [${emp.dept}] ${emp.name}(${emp.role})이 작업을 시작합니다...`)

      try {
        const res = await fetch('/api/employee-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'autonomous-task',
            employeeId: emp.id,
            employeeName: emp.name,
            dept: emp.dept,
            role: emp.role,
            speech: emp.speech,
            message: command,
            previousSummary: (prevResult ? `이전 작업 결과:\n${prevResult}` : '') + memoryContext,
          }),
        })
        const data = await res.json() as { progress: string; result: string; model?: string }

        if (data.model === 'gemini') {
          addLog('sys', '🟡 Gemini Flash 사용')
        }

        // 결과 표시
        await new Promise(r => setTimeout(r, 300))
        addLog('employee', `[${emp.dept}] ${emp.emoji || '👤'} ${emp.name}(${emp.role}): ${data.result}`)

        // 상태 업데이트
        setEmpStatus(emp.id, 'done', '✅ 완료!')
        setEmpBubble(emp.id, '✅ 완료!', 180)
        updateTaskStep(taskId, emp.id, {
          status: 'done',
          message: data.progress,
          result: data.result,
          finishedAt: Date.now(),
        })

        results.push(`[${emp.dept}/${emp.name}] ${data.result}`)
        prevResult = results.join('\n---\n')

        // 다음 직원 전 짧은 딜레이
        await new Promise(r => setTimeout(r, 500))
      } catch {
        setEmpStatus(emp.id, 'idle')
        setEmpBubble(emp.id, '⚠️ 오류', 120)
        updateTaskStep(taskId, emp.id, { status: 'failed', message: '처리 실패', finishedAt: Date.now() })
        addLog('sys', `⚠️ [${emp.dept}] ${emp.name} 작업 중 오류 발생`)
      }
    }

    // 최종 종합 보고 (비서가 취합)
    if (results.length > 1) {
      addLog('sys', '📋 이수연 비서가 결과를 종합하고 있습니다...')
      try {
        const summaryRes = await fetch('/api/employee-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'task-summary',
            employeeId: '', employeeName: '', dept: '', role: '', speech: '',
            message: command,
            previousSummary: results.join('\n\n'),
          }),
        })
        const summaryData = await summaryRes.json() as { summary: string }
        addLog('employee', `[비서] 📌 이수연: ${summaryData.summary}`)
        finishTask(taskId, summaryData.summary)
      } catch {
        finishTask(taskId, '업무가 완료되었습니다.')
      }
    } else {
      finishTask(taskId, results[0] || '업무가 완료되었습니다.')
    }

    addLog('sys', `✅ 자율 업무 완료! (${assignees.length}명 참여, ${targetDepts.join('·')} 부서)`)

    // Phase 4: 학습 추출 (백그라운드)
    const finalSummary = results.join('\n')
    extractAndSaveLearning(command, targetDepts, finalSummary)

    // 직원들 idle로 복귀
    setTimeout(() => {
      for (const emp of assignees) {
        setEmpStatus(emp.id, 'idle')
      }
    }, 3000)
  }, [addLog, addTask, updateTaskStep, finishTask, setEmpStatus, setEmpBubble, getMemoryContext, extractAndSaveLearning])

  // ── Phase 2: 스웜 협업 실행 (복수 부서 페이즈 기반) ──

  // 한 페이즈 내 부서 직원들 실행 (동시 실행 가능한 부서들)
  const executePhaseForDept = useCallback(async (
    taskId: string, command: string, dept: string, prevResult: string
  ): Promise<string> => {
    const allEmps = [...EMPLOYEES, ...useOfficeStore.getState().dynamicEmployees]
    const deptEmps = allEmps.filter(e => e.dept === dept)
    const leader = deptEmps.find(e => e.role === '팀장' || e.role === '수석비서')
    const worker = deptEmps.find(e => e.role !== '팀장' && e.role !== '수석비서' && e.role !== '레드팀')

    const assignees = [leader, worker].filter(Boolean) as Employee[]
    if (assignees.length === 0) return `[${dept}] 담당자 없음`

    const results: string[] = []
    let chainResult = prevResult

    for (const emp of assignees) {
      setEmpStatus(emp.id, 'work', `스웜 작업 중`)
      setEmpBubble(emp.id, '🐝 스웜 작업 중...', 999)
      updateTaskStep(taskId, emp.id, { status: 'working', startedAt: Date.now(), message: '스웜 작업 수행 중...' })

      try {
        const res = await fetch('/api/employee-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'autonomous-task',
            employeeId: emp.id,
            employeeName: emp.name,
            dept: emp.dept,
            role: emp.role,
            speech: emp.speech,
            message: command,
            previousSummary: chainResult ? `이전 단계 결과:\n${chainResult}` : '',
          }),
        })
        const data = await res.json() as { progress: string; result: string; model?: string }

        addLog('employee', `  [${emp.dept}] ${emp.emoji || '👤'} ${emp.name}(${emp.role}): ${data.result}`)
        setEmpStatus(emp.id, 'done', '✅ 완료!')
        setEmpBubble(emp.id, '✅ 완료!', 180)
        updateTaskStep(taskId, emp.id, {
          status: 'done', message: data.progress, result: data.result, finishedAt: Date.now(),
        })
        results.push(data.result)
        chainResult = results.join('\n')

        await new Promise(r => setTimeout(r, 300))
      } catch {
        setEmpStatus(emp.id, 'idle')
        setEmpBubble(emp.id, '⚠️ 오류', 120)
        updateTaskStep(taskId, emp.id, { status: 'failed', message: '처리 실패', finishedAt: Date.now() })
      }
    }

    // 직원 idle 복귀
    setTimeout(() => {
      for (const emp of assignees) setEmpStatus(emp.id, 'idle')
    }, 2000)

    return results.join('\n')
  }, [addLog, updateTaskStep, setEmpStatus, setEmpBubble])

  const executeSwarmTask = useCallback(async (command: string) => {
    const targetDepts = detectTaskDepts(command)
    const allEmps = [...EMPLOYEES, ...useOfficeStore.getState().dynamicEmployees]

    // Phase 4: 과거 메모리 조회
    const memoryContext = getMemoryContext(command, targetDepts)
    if (memoryContext) {
      addLog('sys', `🧠 관련 과거 업무 기억 참조 중...`)
    }

    addLog('sys', `🐝 스웜 협업 시작 — ${targetDepts.length}개 부서 협업 모드`)
    addLog('sys', `📋 AI가 업무 분해 계획을 수립하고 있습니다...`)

    // 1. AI에게 워크플로우 계획 요청
    let phases: SwarmPhase[] = []
    try {
      const planRes = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swarm-plan',
          message: command,
          previousSummary: targetDepts.join(','),
          employeeId: '', employeeName: '', dept: '', role: '', speech: '',
        }),
      })
      const planData = await planRes.json() as {
        plan: Array<{ name: string; depts: string[]; description: string }>
        model?: string
      }

      phases = planData.plan.map((p, i) => ({
        id: i,
        name: p.name,
        depts: p.depts,
        description: p.description,
        status: 'pending' as const,
      }))

      // 계획 표시
      addLog('sys', `🗺️ 워크플로우 계획 (${phases.length}단계):`)
      for (const p of phases) {
        addLog('sys', `  ${p.id + 1}. [${p.name}] ${p.depts.join(' + ')} — ${p.description}`)
      }
    } catch {
      // 폴백: 부서 순서대로
      phases = targetDepts.map((d, i) => ({
        id: i,
        name: `페이즈 ${i + 1}`,
        depts: [d],
        description: `${d} 부서 작업`,
        status: 'pending' as const,
      }))
    }

    // 2. Task 생성 (모든 페이즈의 직원을 steps에 포함)
    const taskId = `swarm_${Date.now()}`
    const allSteps: TaskStep[] = []
    for (const phase of phases) {
      for (const dept of phase.depts) {
        const deptEmps = allEmps.filter(e => e.dept === dept)
        const leader = deptEmps.find(e => e.role === '팀장' || e.role === '수석비서')
        const worker = deptEmps.find(e => e.role !== '팀장' && e.role !== '수석비서' && e.role !== '레드팀')
        for (const emp of [leader, worker].filter(Boolean) as Employee[]) {
          allSteps.push({
            empId: emp.id, empName: emp.name, dept: emp.dept,
            status: 'pending', message: `[${phase.name}] 대기 중...`,
          })
        }
      }
    }

    const task: AutonomousTask = {
      id: taskId, command, targetDepts, steps: allSteps,
      status: 'working', createdAt: Date.now(),
      isSwarm: true, phases, currentPhase: 0,
    }
    addTask(task)

    // 3. 페이즈별 순차 실행 (페이즈 내 부서는 병렬)
    let prevPhaseResult = ''

    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi]
      setCurrentPhase(taskId, pi)
      updateSwarmPhase(taskId, pi, { status: 'working' })

      addLog('sys', `\n🔄 [페이즈 ${pi + 1}/${phases.length}] ${phase.name} 시작 — ${phase.depts.join(' + ')}`)

      // 페이즈 내 부서들 동시 실행
      const deptPromises = phase.depts.map(dept =>
        executePhaseForDept(taskId, command, dept, prevPhaseResult)
      )
      const deptResults = await Promise.all(deptPromises)
      const phaseResult = deptResults.join('\n---\n')

      // 페이즈 결과 요약 (다음 페이즈에 전달)
      if (pi < phases.length - 1) {
        try {
          const summaryRes = await fetch('/api/employee-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'phase-summary',
              message: command,
              dept: phase.name,
              previousSummary: phaseResult,
              employeeId: '', employeeName: '', role: '', speech: '',
            }),
          })
          const summaryData = await summaryRes.json() as { summary: string }
          prevPhaseResult = summaryData.summary
          addLog('sys', `📌 [${phase.name}] 요약 → ${summaryData.summary}`)
        } catch {
          prevPhaseResult = phaseResult.slice(0, 500)
        }
      } else {
        prevPhaseResult = phaseResult
      }

      updateSwarmPhase(taskId, pi, { status: 'done', result: prevPhaseResult })
      addLog('sys', `✅ [${phase.name}] 완료!`)

      await new Promise(r => setTimeout(r, 500))
    }

    // 4. 최종 종합 보고
    addLog('sys', '\n📋 이수연 비서가 스웜 결과를 종합하고 있습니다...')
    try {
      const finalRes = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'task-summary',
          message: command,
          previousSummary: prevPhaseResult,
          employeeId: '', employeeName: '', dept: '', role: '', speech: '',
        }),
      })
      const finalData = await finalRes.json() as { summary: string }
      addLog('employee', `[비서] 📌 이수연: ${finalData.summary}`)
      finishTask(taskId, finalData.summary)
    } catch {
      finishTask(taskId, '스웜 협업이 완료되었습니다.')
    }

    addLog('sys', `🐝 스웜 협업 완료! (${phases.length}단계, ${targetDepts.join('·')} 부서)`)

    // Phase 4: 학습 추출 (백그라운드)
    extractAndSaveLearning(command, targetDepts, prevPhaseResult)
  }, [addLog, addTask, updateSwarmPhase, setCurrentPhase, finishTask, executePhaseForDept, getMemoryContext, extractAndSaveLearning])

  // 회의 종료 — 팀장들 원래 자리로 복귀
  const endMeeting = useCallback(() => {
    setMeetingMode(false)
    setMeetingHistory([])
    setActiveSession('main')
    // 팀장들을 원래 자리로 복귀
    Object.entries(meetingLeaderSeats).forEach(([id, seat], i) => {
      setTimeout(() => walkEmpTo(id, seat.x, seat.y), i * 150)
    })
    setMeetingLeaderSeats({})
    addLog('sys', '🏛️ 회의가 종료되었습니다. 팀장들이 자리로 복귀합니다.')
  }, [meetingLeaderSeats, walkEmpTo, setActiveSession, addLog, setMeetingMode, setMeetingHistory, setMeetingLeaderSeats])

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

  const send = async (preset?: string) => {
    const cmd = preset ?? input.trim()
    if (!cmd || isLoading) return
    setInput('')
    // textarea 높이 리셋
    const ta = document.querySelector<HTMLTextAreaElement>('.flex.gap-1\\.5 textarea')
    if (ta) ta.style.height = 'auto'

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
    await handleCommand(cmd)
  }

  // 부서 감지
  const detectDept = (text: string): string | null => {
    const lower = text.toLowerCase()
    for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) return dept
    }
    return null
  }

  const handleCommand = async (cmd: string) => {
    const lower = cmd.toLowerCase()

    // 빠른 키워드 매칭 (즉시 응답) — 업무 지시와 구분
    // "현황 보고" vs "보고서 작성해줘" 구분: 짧은 현황 질문만 매칭
    if ((lower.includes('현황') || lower === '보고') && !(/작성|만들|준비|분석|조사/.test(lower))) {
      addLog('employee', '[AIDE] 이수연: 현황 확인할게요. 잠시만요.')
      return
    }
    if (lower.includes('늦')) {
      addLog('employee', waitingApproval
        ? '[AIDE] 이수연: 대표님 결재 대기예요. 승인 버튼 눌러주세요!'
        : '[AIDE] 이수연: 지연 없어요. 정상 진행 중이에요.')
      return
    }
    if (lower.includes('회의')) {
      setMeetingMode(true)
      setActiveSession('meeting')
      // 팀장+이사+수석비서 원래 좌석 저장 후 회의실로 이동
      const allEmps = [...EMPLOYEES, ...useOfficeStore.getState().dynamicEmployees]
      const leaders = allEmps.filter(e => e.role === '팀장' || e.role === '이사' || e.role === '수석비서')
      const states = useOfficeStore.getState().empStates
      const seats: Record<string, {x:number,y:number}> = {}
      leaders.forEach((leader, i) => {
        const st = states[leader.id]
        // 원래 좌석: empStates에 있으면 현재 위치, 없으면 homeX/homeY 사용
        seats[leader.id] = { x: st?.x ?? leader.homeX, y: st?.y ?? leader.homeY }
        const meetX = 17 + (i % 5)
        const meetY = 17 + Math.floor(i / 5)
        setTimeout(() => walkEmpTo(leader.id, meetX, meetY), i * 150)
      })
      setMeetingLeaderSeats(seats)
      addLog('employee', '[AIDE] 이수연: 전원 회의실 소집! 🏛️ 안건을 입력해주세요, 대표님.')
      return
    }
    if (lower.includes('승인')) {
      addLog('employee', waitingApproval
        ? '[꽁꽁(대표)] 승인!'
        : '[AIDE] 이수연: 현재 승인 대기 안건 없어요.')
      return
    }
    if (lower.includes('집중')) {
      addLog('employee', '[전원] 집중 모드 ON. 자리로 복귀합니다.')
      return
    }

    // 부서 생성 감지 (일반 모드에서도)
    const deptToCreate = detectDeptCreation(cmd)
    if (deptToCreate) {
      await createDepartment(deptToCreate, cmd)
      return
    }

    // 자율 업무 감지 → 부서 자동 분배 & 실행 (부서 스킬 표시보다 우선)
    const taskCmd = detectTask(cmd)
    if (taskCmd) {
      setIsLoading(true)
      try {
        const taskDepts = detectTaskDepts(taskCmd)
        if (taskDepts.length >= 2) {
          // Phase 2: 복수 부서 → 스웜 협업 모드
          await executeSwarmTask(taskCmd)
        } else {
          // Phase 1: 단일 부서 → 기존 자율 업무
          await executeAutonomousTask(taskCmd)
        }
      } finally {
        setIsLoading(false)
      }
      return
    }

    // 부서 감지 → 스킬 자동 표시 (단순 부서 언급일 때만)
    const detectedDept = detectDept(cmd)
    if (detectedDept) {
      const skills = DEPT_SKILLS[detectedDept]
      const leader = EMPLOYEES.find(e => e.dept === detectedDept && (e.role === '팀장' || e.role === '수석비서'))
      if (skills && skills.length > 0) {
        const skillList = skills.map(s => `${s.icon} ${s.label}`).join(' · ')
        addLog('sys', `🔧 [${detectedDept}] 활성 스킬: ${skillList}`)
        if (leader) {
          addLog('employee', `[${detectedDept}] ${leader.name}: 스킬 준비 완료! 작업 시작합니다.`)
        }
        return
      }
    }

    // 인식 못한 명령 → AI 비서(이수연)에게 전달
    setIsLoading(true)
    try {
      const aide = EMPLOYEES.find(e => e.code === 'AIDE')!
      const res = await fetch('/api/employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: aide.id,
          employeeName: aide.name,
          dept: aide.dept,
          role: aide.role,
          speech: aide.speech,
          message: cmd,
          history: [],
        }),
      })
      const data = await res.json() as { reply: string; model?: string }
      addLog('employee', `[AIDE] ${aide.name}: ${data.reply}`)
    } catch {
      addLog('employee', '[AIDE] 이수연: 죄송합니다, 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
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
                onClick={endMeeting}
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

      {/* 팀별 세션 탭 */}
      {mounted && (
        <div className="flex gap-0.5 px-1.5 pt-1.5 pb-1 border-b border-[#1e3a5f] shrink-0 overflow-x-auto scrollbar-none">
          {/* 전체 탭 */}
          <button
            onClick={() => { setActiveSession('main'); setMeetingMode(false); setSelectedEmployee(null) }}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap transition-colors ${
              activeSession === 'main'
                ? 'bg-[#4af] text-black'
                : 'bg-[#0a0e1a] border border-[#1e3a5f] text-[#6b8cbb] hover:border-[#4af] hover:text-[#4af]'
            }`}
          >
            📋 전체
          </button>
          {/* 회의 탭 (항상 표시) */}
          <button
            onClick={() => { setActiveSession('meeting'); setMeetingMode(true); setSelectedEmployee(null) }}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap transition-colors ${
              activeSession === 'meeting'
                ? 'bg-[#ffa94d] text-black'
                : 'bg-[#0a0e1a] border border-[#1e3a5f] text-[#6b8cbb] hover:border-[#ffa94d] hover:text-[#ffa94d]'
            }`}
          >
            🏛️ 회의
          </button>
          {/* 부서 탭 — 13개 고정 */}
          {Object.entries(DEPT_COLORS).map(([dept, color]) => {
            const isActive = activeSession === dept
            const hasLogs = (useOfficeStore.getState().sessionLogs[dept]?.length ?? 0) > 0
            return (
              <button
                key={dept}
                onClick={() => {
                  setActiveSession(dept)
                  setMeetingMode(false)
                  const leader = [...EMPLOYEES, ...useOfficeStore.getState().dynamicEmployees]
                    .find(e => e.dept === dept && (e.role === '팀장' || e.role === '이사' || e.role === '수석비서'))
                  if (leader) setSelectedEmployee(leader)
                  else setSelectedEmployee(null)
                }}
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-black'
                    : hasLogs
                      ? 'bg-[#0a0e1a] border text-[#6b8cbb] hover:text-white'
                      : 'bg-[#0a0e1a] border border-[#1e3a5f33] text-[#3a4a5f] hover:text-[#6b8cbb]'
                }`}
                style={isActive
                  ? { backgroundColor: color }
                  : hasLogs
                    ? { borderColor: color + '80' }
                    : undefined
                }
              >
                {dept}
              </button>
            )
          })}
        </div>
      )}

      {/* 퀵버튼 (일반 모드일 때만) */}
      {!selectedEmployee && !meetingMode && (
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
      <div className="flex gap-1.5 p-2 border-t-2 border-[#1e3a5f] shrink-0 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={meetingMode ? '🏛️ 회의 안건 입력…' : selectedEmployee ? `${selectedEmployee.name}에게 말하기…` : '지시 입력… (Shift+Enter 줄바꿈)'}
          disabled={isLoading}
          rows={1}
          onInput={(e) => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 120) + 'px'
          }}
          className="flex-1 px-3 py-2 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded outline-none focus:border-[#4af] placeholder:text-[#4a6fa5] disabled:opacity-50 resize-none overflow-y-auto"
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={() => send()}
          disabled={isLoading}
          className="px-3 py-2 bg-[#4af] text-black text-xs font-bold rounded hover:bg-[#7bf] transition-colors disabled:opacity-50 shrink-0"
          style={selectedEmployee ? { background: selectedEmployee.deptColor } : undefined}
        >
          {isLoading ? '…' : '전송'}
        </button>
      </div>
    </div>
  )
}
