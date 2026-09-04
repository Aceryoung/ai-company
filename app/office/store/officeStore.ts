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

interface OfficeStore {
  // 직원 상태
  empStates: Record<string, EmployeeState>
  setEmpStatus: (id: string, status: EmployeeStatus, bubble?: string) => void
  setEmpBubble: (id: string, bubble: string, duration?: number) => void
  walkEmpTo: (id: string, tx: number, ty: number, onArrived?: () => void) => void
  tickEmpBubbles: () => void

  // 채팅
  chatLog: ChatMessage[]
  addLog: (type: ChatMessage['type'], text: string) => void
  setChatLog: (msgs: ChatMessage[]) => void

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

    // ── 채팅
    chatLog: [],
    addLog: (type, text) =>
      set((s) => {
        const next = [...s.chatLog, { type, text, at: Date.now() }]
        return { chatLog: next.slice(-60) }
      }),
    setChatLog: (msgs) => set({ chatLog: msgs }),

    // ── 시나리오
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
