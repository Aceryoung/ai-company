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
  repos?: string[]   // 담당 레포 (예: ['familyproject', 'sentence-collector'])
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

  // 채팅
  chatLog: ChatMessage[]
  _chatLogHydrated: boolean
  hydrateChatLog: () => void
  addLog: (type: ChatMessage['type'], text: string) => void
  setChatLog: (msgs: ChatMessage[]) => void

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
      set((s) => ({
        empStates: {
          ...s.empStates,
          [id]: { ...s.empStates[id], tx, ty, walking: true, onArrived },
        },
      })),

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

    // ── 채팅 (localStorage 연동 — hydration 안전하게 빈 배열로 시작, useEffect로 복원)
    chatLog: [],
    _chatLogHydrated: false,
    hydrateChatLog: () => {
      if (typeof window === 'undefined') return
      const s = get()
      if (s._chatLogHydrated) return
      const patch: Partial<OfficeStore> = { _chatLogHydrated: true }
      try {
        const cl = localStorage.getItem('office-chat-log')
        if (cl) patch.chatLog = JSON.parse(cl) as ChatMessage[]
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
      set(patch)
    },
    addLog: (type, text) =>
      set((s) => {
        const next = [...s.chatLog, { type, text, at: Date.now() }].slice(-60)
        try { localStorage.setItem('office-chat-log', JSON.stringify(next)) } catch { /* ignore */ }
        return { chatLog: next }
      }),
    setChatLog: (msgs) => {
      try { localStorage.setItem('office-chat-log', JSON.stringify(msgs)) } catch { /* ignore */ }
      set({ chatLog: msgs })
    },

    // ── 시나리오
    // ── 동적 직원 (회의에서 생성)
    dynamicEmployees: [],
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
