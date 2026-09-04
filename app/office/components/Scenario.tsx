// components/Scenario.tsx — 12단계 AI COMPANY 시나리오
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { EMPLOYEES } from '../data/employees'
import { useUsageTracker } from '../hooks/useUsageTracker'

interface ScenarioStep {
  num: string
  label: string
  desc: string
  dept: string
  leader: string
  action: string
  duration: number   // ms
  needsApproval?: boolean
}

const STEPS: ScenarioStep[] = [
  { num: '①', label: '출근',     desc: '전 직원 자리 배치',         dept: '전체',     leader: '이수연', action: '전원 출근 확인 완료!',           duration: 2000 },
  { num: '②', label: '시장조사',  desc: 'AI 트렌드·경쟁사 스캔',    dept: '시장조사',  leader: '박서준', action: 'AI 트렌드 리포트 작성 완료',     duration: 3000 },
  { num: '③', label: '문의접수',  desc: '고객 요청 수집·분류',       dept: '영업',     leader: '한미래', action: '신규 문의 3건 접수 완료',        duration: 2500 },
  { num: '④', label: '기획',     desc: 'PRD·와이어프레임 작성',     dept: '기획',     leader: '김도현', action: 'PRD 초안 작성 완료',             duration: 3000 },
  { num: '⑤', label: '검수',     desc: '코드 리뷰·QA 검증',        dept: '검수',     leader: '장하윤', action: '검수 리포트 제출',               duration: 2500 },
  { num: '⑥', label: 'TOP 정리', desc: '우선순위 정렬·스코어링',    dept: '기획',     leader: '김도현', action: 'TOP 3 개선사항 정리 완료',       duration: 2000 },
  { num: '⑦', label: '대표 승인', desc: '결재 대기',                dept: '비서',     leader: '이수연', action: '대표님 승인 대기 중…',           duration: 1500, needsApproval: true },
  { num: '⑧', label: '개발',     desc: '코드 구현·테스트',          dept: '개발',     leader: '권민준', action: '빌드 시작! 테스트 통과 목표',     duration: 4000 },
  { num: '⑨', label: '런칭',     desc: '배포·모니터링',             dept: '배포',     leader: '신예준', action: '프로덕션 배포 완료 🚀',          duration: 2500 },
  { num: '⑩', label: '고객소통',  desc: '피드백 수집·응대',          dept: '고객소통',  leader: '문지아', action: '고객 피드백 5건 수집',           duration: 2500 },
  { num: '⑪', label: '정산',     desc: '매출/비용 정리',            dept: '정산',     leader: '오재민', action: '이번 달 정산 마감 완료',          duration: 2000 },
  { num: '⑫', label: '회고+브리핑', desc: '스프린트 회고·다음 계획', dept: '회고',     leader: '황채은', action: '회고 리포트 공유 완료',          duration: 3000 },
]

export function Scenario() {
  const {
    scenarioStep, scenarioRunning, waitingApproval,
    setScenarioStep, setScenarioRunning, setWaitingApproval,
    setEmpStatus, setEmpBubble, addLog, limitHit,
  } = useOfficeStore()
  const { logUsage } = useUsageTracker()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 단계 실행
  const runStep = useCallback((stepIdx: number) => {
    if (stepIdx >= STEPS.length) {
      setScenarioRunning(false)
      addLog('sys', '✅ 12단계 시나리오 완료! 수고했어요 🎉')
      // 전원 done
      for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'done', '완료!')
      return
    }

    const step = STEPS[stepIdx]
    setScenarioStep(stepIdx)
    addLog('sys', `${step.num} ${step.label} 시작 — ${step.desc}`)

    // 해당 부서 직원 work 상태로
    for (const emp of EMPLOYEES) {
      if (step.dept === '전체' || emp.dept === step.dept) {
        setEmpStatus(emp.id, 'work', step.action)
      }
    }

    // 팀장 보고
    const leader = EMPLOYEES.find(e => e.name === step.leader)
    if (leader) {
      setTimeout(() => {
        setEmpBubble(leader.id, step.action, 250)
        addLog('employee', `[${step.dept}] ${step.leader}: ${step.action}`)
      }, step.duration * 0.6)
    }

    // 승인 필요 단계
    if (step.needsApproval) {
      setWaitingApproval(true)
      addLog('sys', '⏳ 대표님 승인이 필요합니다. "승인할게" 버튼을 눌러주세요.')
      // 대기 — approve()가 호출되면 다음 단계로
      return
    }

    // 자동 진행
    timerRef.current = setTimeout(() => {
      // 이전 부서 done
      for (const emp of EMPLOYEES) {
        if (step.dept === '전체' || emp.dept === step.dept) {
          setEmpStatus(emp.id, 'done', '✅ 완료')
        }
      }
      runStep(stepIdx + 1)
    }, step.duration)
  }, [setScenarioStep, setScenarioRunning, setWaitingApproval, setEmpStatus, setEmpBubble, addLog])

  // ── 시나리오 시작
  const startScenario = () => {
    if (scenarioRunning) return
    setScenarioRunning(true)
    setScenarioStep(-1)
    addLog('sys', '🏢 AI COMPANY 12단계 시나리오 시작!')
    logUsage('scenario', '12단계 시나리오 시작')
    // 전원 idle
    for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'idle')
    setTimeout(() => runStep(0), 500)
  }

  // ── 승인
  const approve = () => {
    if (!waitingApproval) return
    setWaitingApproval(false)
    addLog('boss', '승인!')
    addLog('sys', '✅ 대표 승인 완료! 다음 단계로 진행합니다.')
    // 비서팀 done
    for (const emp of EMPLOYEES) {
      if (emp.dept === '비서') setEmpStatus(emp.id, 'done', '승인 완료!')
    }
    timerRef.current = setTimeout(() => runStep(scenarioStep + 1), 1000)
  }

  // ── 리셋
  const resetScenario = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setScenarioRunning(false)
    setScenarioStep(-1)
    setWaitingApproval(false)
    for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'idle')
    addLog('sys', '🔄 시나리오 초기화')
  }

  // 한도 소진 시 자동 정지
  useEffect(() => {
    if (limitHit && scenarioRunning) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setScenarioRunning(false)
      for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'link', '연동 대기')
      addLog('sys', '⚠️ 한도 소진 — 시나리오 일시 중단')
    }
  }, [limitHit])

  // 클린업
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#4af]">📋 12단계 시나리오</h2>
        <div className="flex gap-1.5">
          {!scenarioRunning ? (
            <button
              onClick={startScenario}
              className="px-3 py-1.5 text-[11px] font-bold bg-[#001a00] border border-[#0f0] text-[#0f0] rounded hover:bg-[#002a00] transition-colors"
            >
              ▶ 시작
            </button>
          ) : (
            <button
              onClick={resetScenario}
              className="px-3 py-1.5 text-[11px] font-bold bg-[#1a0800] border border-[#f80] text-[#f80] rounded hover:bg-[#2a1000] transition-colors"
            >
              ⏹ 리셋
            </button>
          )}
        </div>
      </div>

      {/* 진행률 */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-[#1e3a5f] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4af] transition-all duration-500"
              style={{ width: `${Math.max(0, ((scenarioStep + 1) / STEPS.length) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#6b8cbb] shrink-0">
            {scenarioStep < 0 ? '0' : scenarioStep + 1}/{STEPS.length}
          </span>
        </div>
      </div>

      {/* 단계 목록 */}
      <div className="flex flex-col gap-1.5">
        {STEPS.map((s, i) => {
          const isCurrent = i === scenarioStep
          const isDone = i < scenarioStep
          const isWaiting = isCurrent && s.needsApproval && waitingApproval

          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs transition-all ${
                isDone
                  ? 'bg-[#001a00] border-[#0f0]/40 text-[#0f0]'
                  : isCurrent
                  ? 'bg-[#0a1628] border-[#4af] text-[#4af]'
                  : 'bg-[#0a0e1a] border-[#1e3a5f] text-[#4a6fa5]'
              }`}
            >
              <span className="font-bold w-5 shrink-0">{s.num}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded" style={{
                    background: isCurrent ? '#4af20' : 'transparent',
                    color: isDone ? '#0f0' : isCurrent ? '#4af' : '#4a6fa5',
                  }}>
                    {s.dept}
                  </span>
                </div>
                <div className="text-[10px] opacity-70 mt-0.5">{s.desc}</div>
              </div>

              {/* 상태 표시 */}
              {isDone && <span className="text-sm shrink-0">✅</span>}
              {isCurrent && !isWaiting && <span className="text-sm animate-pulse shrink-0">▶️</span>}
              {isWaiting && (
                <button
                  onClick={approve}
                  className="px-2 py-1 text-[10px] font-bold bg-[#1a0800] border border-[#f80] text-[#f80] rounded animate-pulse shrink-0"
                >
                  👑 승인
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
