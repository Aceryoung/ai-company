// store/officeStore.ts — Zustand 전역 상태
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ── 타입 정의
export type EmployeeStatus = 'idle' | 'work' | 'done' | 'boss' | 'link'

export interface Employee {
  id: string
  name: string
  code: string
  role: string
  dept: string
  deptColor: string
  speech: string
  emoji: string
  homeX: number
  homeY: number
  repos?: string[]      // 담당 레포 (예: ['familyproject', 'sentence-collector'])
  forceModel?: 'claude' // 이 직원은 항상 Claude 사용 (Gemini 폴백 안 함)
}

export interface EmployeeState {
  status: EmployeeStatus
  bubble: string
  bubbleTimer: number
  x: number
  y: number
  tx: number
  ty: number
  walking: boolean
}

export interface ChatMessage {
  type: 'boss' | 'employee' | 'sys'
  text: string
  at: number
}

export interface PipelineState {
  currentRepo: string | null
  step: number          // 0~7 (8단계)
  stopped: boolean
  scanResult: { summary: string; improvements: Improvement[] } | null
  selectedItems: Improvement[]
  buildResult: string
  retroResult: string
  guardResult: { passed: boolean; summary: string; issues: string[] } | null
  opsResult: { ready: boolean; checklist: string[] } | null
  savedAt: number | null
}

export interface Improvement {
  id: string
  title: string
  description: string
  type: 'perf' | 'sec' | 'feat' | 'refactor' | 'doc'
  priority: 'high' | 'medium' | 'low'
  effort: 'small' | 'medium' | 'large'
  auto?: boolean        // 자동 수정 가능 여부
  files?: string[]      // 관련 파일 목록
  aiPrompt?: string     // AI 코드 수정 프롬프트
}

export interface EmployeeChatMsg {
  role: 'user' | 'assistant'
  content: string
}

// ── 자율 업무 시스템
export type TaskStatus = 'pending' | 'working' | 'done' | 'failed'

export interface TaskStep {
  empId: string
  empName: string
  dept: string
  status: TaskStatus
  message: string       // 진행 상황 메시지
  result?: string       // 완료 결과
  startedAt?: number
  finishedAt?: number
}

// Phase 2: 스웜 협업 — 페이즈 기반 멀티 부서
export interface SwarmPhase {
  id: number
  name: string              // "리서치", "기획", "실행", "검증" 등
  depts: string[]           // 이 페이즈에 참여하는 부서들
  description: string       // AI가 생성한 이 페이즈 설명
  status: TaskStatus
  result?: string           // 페이즈 종합 결과
}

// Phase 4: 학습/메모리 — 과거 업무 결과 기억
export interface TaskMemory {
  id: string
  command: string           // 원래 업무 지시
  depts: string[]           // 관련 부서
  summary: string           // 업무 결과 요약
  learnings: string[]       // 핵심 교훈/인사이트
  keywords: string[]        // 검색용 키워드
  createdAt: number
}

export interface AutonomousTask {
  id: string
  command: string           // 원래 지시
  targetDepts: string[]     // 관련 부서
  steps: TaskStep[]         // 부서별 작업 단계
  status: TaskStatus        // 전체 상태
  summary?: string          // 최종 종합 보고
  createdAt: number
  finishedAt?: number
  // Phase 2: 스웜 모드
  isSwarm?: boolean         // 스웜 협업 여부
  phases?: SwarmPhase[]     // 페이즈 목록
  currentPhase?: number     // 현재 실행 중인 페이즈 인덱스
}

interface OfficeStore {
  // 직원 대화 (캔버스 클릭 → 페르소나 채팅)
  selectedEmployee: Employee | null
  setSelectedEmployee: (emp: Employee | null) => void

  // 직원별 대화 히스토리 (직원 ID → 메시지 배열)
  employeeChatHistories: Record<string, EmployeeChatMsg[]>
  addEmployeeChatMsg: (empId: string, msg: EmployeeChatMsg) => void
  clearEmployeeChatHistory: (empId: string) => void

  // 직원별 이전 대화 요약 (새로고침 후에도 컨텍스트 유지)
  employeeChatSummaries: Record<string, string>
  setEmployeeChatSummary: (empId: string, summary: string) => void

  // 직원 상태
  empStates: Record<string, EmployeeState>
  setEmpStatus: (id: string, status: EmployeeStatus, bubble?: string) => void
  setEmpBubble: (id: string, bubble: string, duration?: number) => void
  walkEmpTo: (id: string, tx: number, ty: number, onArrived?: () => void) => void
  tickEmpBubbles: () => void

  // 채팅 — 세션 기반
  chatLog: ChatMessage[]                          // 호환용 (activeSession의 로그 뷰)
  _chatLogHydrated: boolean
  hydrateChatLog: () => void
  addLog: (type: ChatMessage['type'], text: string) => void
  setChatLog: (msgs: ChatMessage[]) => void

  // 세션 시스템
  activeSession: string                           // 'main' | 'meeting' | dept 이름
  sessionLogs: Record<string, ChatMessage[]>      // 세션별 채팅 로그
  visitedSessions: string[]                       // 방문한 세션 목록 (탭 표시용)
  sessionSummaries: Record<string, string>        // 세션별 대화 요약
  setActiveSession: (session: string) => void
  addSessionLog: (session: string, type: ChatMessage['type'], text: string) => void
  setSessionSummary: (session: string, summary: string) => void
  clearSessionLog: (session: string) => void

  // 회의 상태 (탭 전환해도 유지)
  meetingMode: boolean
  meetingHistory: string[]
  meetingLeaderSeats: Record<string, {x: number, y: number}>
  setMeetingMode: (v: boolean) => void
  setMeetingHistory: (h: string[]) => void
  setMeetingLeaderSeats: (seats: Record<string, {x: number, y: number}>) => void

  // 동적 직원 (회의에서 생성된 부서·직원)
  dynamicEmployees: Employee[]
  addDynamicEmployees: (employees: Employee[]) => void

  // 시나리오
  scenarioStep: number
  waitingApproval: boolean
  scenarioRunning: boolean
  setScenarioStep: (step: number) => void
  setWaitingApproval: (v: boolean) => void
  setScenarioRunning: (v: boolean) => void

  // 파이프라인
  pipeline: PipelineState
  setPipeline: (p: Partial<PipelineState>) => void

  // 플랜 한도
  limitHit: boolean
  limitResetTime: number | null
  pausedAtStep: number
  triggerLimit: (resetTime?: number | null) => void
  resumeLimit: () => void

  // 자율 업무 시스템
  tasks: AutonomousTask[]
  addTask: (task: AutonomousTask) => void
  updateTaskStep: (taskId: string, empId: string, update: Partial<TaskStep>) => void
  updateSwarmPhase: (taskId: string, phaseId: number, update: Partial<SwarmPhase>) => void
  setCurrentPhase: (taskId: string, phase: number) => void
  finishTask: (taskId: string, summary: string) => void

  // Phase 3: 백그라운드 워커
  bgWorkerEnabled: boolean
  bgWorkerLastRun: number
  setBgWorkerEnabled: (v: boolean) => void
  setBgWorkerLastRun: (t: number) => void

  // Phase 4: 학습/메모리
  taskMemories: TaskMemory[]
  addTaskMemory: (memory: TaskMemory) => void
  getRelevantMemories: (command: string, depts: string[]) => TaskMemory[]

  // Claude 한도 현황 (수동 입력, Supabase 동기화)
  claudeLimits: {
    fiveHour: { pct: number; resetAt: number | null }   // 5시간 한도
    weekly:   { pct: number; resetAt: number | null }    // 주간 한도
    updatedAt: number | null
  }
  setClaudeLimits: (limits: Partial<{
    fiveHour: { pct: number; resetAt: number | null }
    weekly:   { pct: number; resetAt: number | null }
  }>) => void
}

const DEFAULT_PIPELINE: PipelineState = {
  currentRepo: null,
  step: 0,
  stopped: false,
  scanResult: null,
  selectedItems: [],
  buildResult: '',
  retroResult: '',
  guardResult: null,
  opsResult: null,
  savedAt: null,
}

export const useOfficeStore = create<OfficeStore>()(
  subscribeWithSelector((set, get) => ({
    // ── 직원 대화
    selectedEmployee: null,
    setSelectedEmployee: (emp) => set({ selectedEmployee: emp }),

    // ── 직원별 대화 히스토리 (localStorage 연동 — hydrate에서 복원)
    employeeChatHistories: {},
    addEmployeeChatMsg: (empId, msg) =>
      set((s) => {
        const next = {
          ...s.employeeChatHistories,
          [empId]: [...(s.employeeChatHistories[empId] ?? []), msg].slice(-20),
        }
        try { localStorage.setItem('emp-chat-histories', JSON.stringify(next)) } catch { /* ignore */ }
        return { employeeChatHistories: next }
      }),
    clearEmployeeChatHistory: (empId) =>
      set((s) => {
        const next = { ...s.employeeChatHistories }
        delete next[empId]
        try { localStorage.setItem('emp-chat-histories', JSON.stringify(next)) } catch { /* ignore */ }
        return { employeeChatHistories: next }
      }),

    // ── 직원별 이전 대화 요약 (hydrate에서 복원)
    employeeChatSummaries: {},
    setEmployeeChatSummary: (empId, summary) =>
      set((s) => {
        const next = { ...s.employeeChatSummaries, [empId]: summary }
        try { localStorage.setItem('emp-chat-summaries', JSON.stringify(next)) } catch { /* ignore */ }
        return { employeeChatSummaries: next }
      }),

    // ── 직원
    empStates: {},

    setEmpStatus: (id, status, bubble) =>
      set((s) => ({
        empStates: {
          ...s.empStates,
          [id]: {
            ...s.empStates[id],
            status,
            ...(bubble !== undefined
              ? { bubble, bubbleTimer: 220 }
              : {}),
          },
        },
      })),

    setEmpBubble: (id, bubble, duration = 220) =>
      set((s) => ({
        empStates: {
          ...s.empStates,
          [id]: { ...s.empStates[id], bubble, bubbleTimer: duration },
        },
      })),

    walkEmpTo: (id, tx, ty, onArrived) =>
      set((s) => {
        const prev = s.empStates[id]
        const base = prev ?? { status: 'idle' as EmployeeStatus, bubble: '', bubbleTimer: 0, x: tx, y: ty }
        return {
          empStates: {
            ...s.empStates,
            [id]: { ...base, tx, ty, walking: true, onArrived },
          },
        }
      }),

    tickEmpBubbles: () =>
      set((s) => {
        const next = { ...s.empStates }
        for (const id in next) {
          if (next[id].bubbleTimer > 0) {
            next[id] = { ...next[id], bubbleTimer: next[id].bubbleTimer - 1 }
          }
        }
        return { empStates: next }
      }),

    // ── 채팅 — 세션 기반 (hydration 안전하게 빈 상태로 시작, useEffect로 복원)
    chatLog: [],
    _chatLogHydrated: false,
    activeSession: 'main',
    sessionLogs: {},
    visitedSessions: ['main'],
    sessionSummaries: (() => {
      if (typeof window === 'undefined') return {}
      try {
        const saved = localStorage.getItem('session-summaries')
        return saved ? (JSON.parse(saved) as Record<string, string>) : {}
      } catch { return {} }
    })(),

    hydrateChatLog: () => {
      if (typeof window === 'undefined') return
      const s = get()
      if (s._chatLogHydrated) return
      const patch: Partial<OfficeStore> = { _chatLogHydrated: true }
      // 세션 로그 복원
      try {
        const sl = localStorage.getItem('session-logs')
        if (sl) {
          const parsed = JSON.parse(sl) as Record<string, ChatMessage[]>
          patch.sessionLogs = parsed
          // activeSession의 로그를 chatLog에 동기화
          patch.chatLog = parsed[s.activeSession] ?? []
        }
      } catch { /* ignore */ }
      // 기존 chatLog 마이그레이션 (sessionLogs가 없으면 chatLog → main 세션으로)
      if (!patch.sessionLogs) {
        try {
          const cl = localStorage.getItem('office-chat-log')
          if (cl) {
            const msgs = JSON.parse(cl) as ChatMessage[]
            patch.sessionLogs = { main: msgs }
            patch.chatLog = msgs
          }
        } catch { /* ignore */ }
      }
      try {
        const vs = localStorage.getItem('visited-sessions')
        if (vs) patch.visitedSessions = JSON.parse(vs) as string[]
      } catch { /* ignore */ }
      try {
        const ch = localStorage.getItem('emp-chat-histories')
        if (ch) patch.employeeChatHistories = JSON.parse(ch) as Record<string, EmployeeChatMsg[]>
      } catch { /* ignore */ }
      try {
        const cs = localStorage.getItem('emp-chat-summaries')
        if (cs) patch.employeeChatSummaries = JSON.parse(cs) as Record<string, string>
      } catch { /* ignore */ }
      try {
        const de = localStorage.getItem('dynamic-employees')
        if (de) patch.dynamicEmployees = JSON.parse(de) as Employee[]
      } catch { /* ignore */ }
      try {
        const bw = localStorage.getItem('bg-worker-enabled')
        if (bw) (patch as Record<string, unknown>).bgWorkerEnabled = JSON.parse(bw) as boolean
      } catch { /* ignore */ }
      try {
        const tm = localStorage.getItem('task-memories')
        if (tm) (patch as Record<string, unknown>).taskMemories = JSON.parse(tm) as TaskMemory[]
      } catch { /* ignore */ }
      set(patch)
    },

    setActiveSession: (session) =>
      set((s) => {
        const visited = s.visitedSessions.includes(session)
          ? s.visitedSessions
          : [...s.visitedSessions, session]
        try { localStorage.setItem('visited-sessions', JSON.stringify(visited)) } catch { /* ignore */ }
        return {
          activeSession: session,
          chatLog: s.sessionLogs[session] ?? [],
          visitedSessions: visited,
        }
      }),

    addSessionLog: (session, type, text) =>
      set((s) => {
        const sessionMsgs = [...(s.sessionLogs[session] ?? []), { type, text, at: Date.now() }].slice(-60)
        const nextLogs = { ...s.sessionLogs, [session]: sessionMsgs }
        try { localStorage.setItem('session-logs', JSON.stringify(nextLogs)) } catch { /* ignore */ }
        // chatLog는 activeSession이면 동기화
        const nextChatLog = session === s.activeSession ? sessionMsgs : s.chatLog
        return { sessionLogs: nextLogs, chatLog: nextChatLog }
      }),

    setSessionSummary: (session, summary) =>
      set((s) => {
        const next = { ...s.sessionSummaries, [session]: summary }
        try { localStorage.setItem('session-summaries', JSON.stringify(next)) } catch { /* ignore */ }
        return { sessionSummaries: next }
      }),

    clearSessionLog: (session) =>
      set((s) => {
        const nextLogs = { ...s.sessionLogs, [session]: [] }
        try { localStorage.setItem('session-logs', JSON.stringify(nextLogs)) } catch { /* ignore */ }
        const nextChatLog = session === s.activeSession ? [] : s.chatLog
        return { sessionLogs: nextLogs, chatLog: nextChatLog }
      }),

    // addLog은 activeSession에 기록 (하위 호환)
    addLog: (type, text) => {
      const session = get().activeSession
      get().addSessionLog(session, type, text)
    },

    setChatLog: (msgs) => {
      const session = get().activeSession
      set((s) => {
        const nextLogs = { ...s.sessionLogs, [session]: msgs }
        try { localStorage.setItem('session-logs', JSON.stringify(nextLogs)) } catch { /* ignore */ }
        return { chatLog: msgs, sessionLogs: nextLogs }
      })
    },

    // ── 자율 업무 시스템
    tasks: [],
    addTask: (task) =>
      set((s) => ({ tasks: [...s.tasks, task] })),
    updateTaskStep: (taskId, empId, update) =>
      set((s) => ({
        tasks: s.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                steps: t.steps.map(step =>
                  step.empId === empId ? { ...step, ...update } : step
                ),
              }
            : t
        ),
      })),
    updateSwarmPhase: (taskId, phaseId, update) =>
      set((s) => ({
        tasks: s.tasks.map(t =>
          t.id === taskId && t.phases
            ? { ...t, phases: t.phases.map(p => p.id === phaseId ? { ...p, ...update } : p) }
            : t
        ),
      })),
    setCurrentPhase: (taskId, phase) =>
      set((s) => ({
        tasks: s.tasks.map(t =>
          t.id === taskId ? { ...t, currentPhase: phase } : t
        ),
      })),
    finishTask: (taskId, summary) =>
      set((s) => ({
        tasks: s.tasks.map(t =>
          t.id === taskId
            ? { ...t, status: 'done' as TaskStatus, summary, finishedAt: Date.now() }
            : t
        ),
      })),

    // ── 회의 상태
    meetingMode: false,
    meetingHistory: [],
    meetingLeaderSeats: {},
    setMeetingMode: (v) => set({ meetingMode: v }),
    setMeetingHistory: (h) => set({ meetingHistory: h }),
    setMeetingLeaderSeats: (seats) => set({ meetingLeaderSeats: seats }),

    // ── 시나리오
    // ── 동적 직원 (회의에서 생성) — 초기화 시 즉시 localStorage 복원
    dynamicEmployees: (() => {
      if (typeof window === 'undefined') return []
      try {
        const saved = localStorage.getItem('dynamic-employees')
        return saved ? (JSON.parse(saved) as Employee[]) : []
      } catch { return [] }
    })(),
    addDynamicEmployees: (employees) =>
      set((s) => {
        const next = [...s.dynamicEmployees, ...employees]
        try { localStorage.setItem('dynamic-employees', JSON.stringify(next)) } catch { /* ignore */ }
        return { dynamicEmployees: next }
      }),

    scenarioStep: -1,
    waitingApproval: false,
    scenarioRunning: false,
    setScenarioStep: (step) => set({ scenarioStep: step }),
    setWaitingApproval: (v) => set({ waitingApproval: v }),
    setScenarioRunning: (v) => set({ scenarioRunning: v }),

    // ── 파이프라인
    pipeline: DEFAULT_PIPELINE,
    setPipeline: (p) =>
      set((s) => ({ pipeline: { ...s.pipeline, ...p } })),

    // ── 플랜 한도
    limitHit: false,
    limitResetTime: null,
    pausedAtStep: -1,

    triggerLimit: (resetTime) =>
      set((s) => ({
        limitHit: true,
        limitResetTime: resetTime ?? null,
        pausedAtStep: s.scenarioStep,
        scenarioRunning: false,
      })),

    resumeLimit: () =>
      set({ limitHit: false, limitResetTime: null }),

    // ── Phase 3: 백그라운드 워커 — 초기화 시 즉시 localStorage 복원
    bgWorkerEnabled: (() => {
      if (typeof window === 'undefined') return false
      try { const v = localStorage.getItem('bg-worker-enabled'); return v ? JSON.parse(v) as boolean : false } catch { return false }
    })(),
    bgWorkerLastRun: 0,
    setBgWorkerEnabled: (v) => {
      try { localStorage.setItem('bg-worker-enabled', JSON.stringify(v)) } catch { /* ignore */ }
      set({ bgWorkerEnabled: v })
    },
    setBgWorkerLastRun: (t) => set({ bgWorkerLastRun: t }),

    // ── Phase 4: 학습/메모리 — 초기화 시 즉시 localStorage 복원
    taskMemories: (() => {
      if (typeof window === 'undefined') return []
      try { const v = localStorage.getItem('task-memories'); return v ? JSON.parse(v) as TaskMemory[] : [] } catch { return [] }
    })(),
    addTaskMemory: (memory) =>
      set((s) => {
        const next = [...s.taskMemories, memory].slice(-30) // 최근 30건만 유지
        try { localStorage.setItem('task-memories', JSON.stringify(next)) } catch { /* ignore */ }
        return { taskMemories: next }
      }),
    getRelevantMemories: (command, depts) => {
      const memories = get().taskMemories
      const lower = command.toLowerCase()
      // 키워드 + 부서 매칭으로 관련 메모리 찾기
      return memories
        .filter(m => {
          const deptMatch = m.depts.some(d => depts.includes(d))
          const keywordMatch = m.keywords.some(k => lower.includes(k.toLowerCase()))
          return deptMatch || keywordMatch
        })
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3) // 최대 3개
    },

    // ── Claude 한도 현황
    claudeLimits: {
      fiveHour: { pct: 0, resetAt: null },
      weekly:   { pct: 0, resetAt: null },
      updatedAt: null,
    },

    setClaudeLimits: (limits) =>
      set((s) => ({
        claudeLimits: {
          fiveHour: limits.fiveHour ?? s.claudeLimits.fiveHour,
          weekly:   limits.weekly   ?? s.claudeLimits.weekly,
          updatedAt: Date.now(),
        },
      })),
  }))
)
