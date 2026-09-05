// hooks/useBackgroundWorker.ts — Phase 3: 직원 자율 백그라운드 작업
'use client'

import { useEffect } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { EMPLOYEES } from '../data/employees'

// 부서별 자율 업무 목록
const DEPT_BG_TASKS: Record<string, string[]> = {
  시장조사: ['최신 AI 시장 트렌드 모니터링', '경쟁사 신규 기능 체크', '업계 뉴스 클리핑 정리'],
  영업: ['미응답 리드 팔로업 체크', '이번 주 파이프라인 현황 정리', '고객 문의 응답 상태 점검'],
  기획: ['백로그 우선순위 재검토', '사용자 피드백 분석 및 정리', 'PRD 진행률 점검'],
  검수: ['코드 품질 메트릭 점검', '미해결 버그 리스트 검토', '테스트 커버리지 현황 확인'],
  개발: ['기술 부채 현황 파악', '의존성 패키지 업데이트 확인', '성능 모니터링 지표 체크'],
  배포: ['배포 파이프라인 상태 점검', '서버 헬스체크 실행', 'CI/CD 빌드 기록 검토'],
  고객소통: ['미답변 고객 문의 확인', 'CS 만족도 지표 점검', '고객 피드백 트렌드 분석'],
  정산: ['이번 달 지출 현황 점검', '미정산 항목 리스트 확인', '매출 추이 데이터 갱신'],
  회고: ['이번 주 작업 로그 정리', '팀별 성과 지표 수집', 'KPT 회고 자료 준비'],
  운영: ['서버 리소스 사용량 체크', '에러 로그 모니터링', '업타임 현황 점검'],
  비서: ['오늘 남은 일정 리마인드 준비', '미확인 메일 목록 정리', '주간 업무 보고서 초안 작성'],
  레포: ['미머지 PR 목록 확인', '브랜치 정리 현황 체크', '커밋 히스토리 정리'],
  채용: ['조직 구성 현황 리뷰', '인력 충원 필요 부서 분석', '채용 파이프라인 점검'],
  마케팅: ['캠페인 성과 지표 점검', '콘텐츠 캘린더 현황 확인', 'SNS 채널 인게이지먼트 분석'],
  경영: ['전 부서 주간 현황 종합 검토', '부서 간 협업 이슈 파악', '핵심 KPI 달성률 점검'],
}

const BG_INTERVAL = 150_000 // 2.5분

// ── 모듈 레벨 싱글턴 (HMR에서도 중복 생성 불가) ──
let _intervalId: ReturnType<typeof setInterval> | null = null
let _timeoutId: ReturnType<typeof setTimeout> | null = null
let _abortCtrl: AbortController | null = null
let _running = false

function stopWorker() {
  if (_timeoutId) { clearTimeout(_timeoutId); _timeoutId = null }
  if (_intervalId) { clearInterval(_intervalId); _intervalId = null }
  if (_abortCtrl) { _abortCtrl.abort(); _abortCtrl = null }
  _running = false
}

async function runOnce() {
  const store = useOfficeStore.getState()
  if (_running || !store.bgWorkerEnabled) return
  _running = true

  const ac = new AbortController()
  _abortCtrl = ac

  try {
    const allEmps = [...EMPLOYEES, ...store.dynamicEmployees]
    const available = allEmps.filter(e => {
      const st = store.empStates[e.id]
      return !st || st.status === 'idle'
    })
    if (available.length === 0) return

    const emp = available[Math.floor(Math.random() * available.length)]
    const tasks = DEPT_BG_TASKS[emp.dept]
    if (!tasks || tasks.length === 0) return
    const task = tasks[Math.floor(Math.random() * tasks.length)]

    store.setEmpStatus(emp.id, 'work')
    store.setEmpBubble(emp.id, `🔄 ${task.slice(0, 12)}...`, 300)

    const res = await fetch('/api/employee-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'background-work',
        employeeId: emp.id,
        employeeName: emp.name,
        dept: emp.dept,
        role: emp.role,
        speech: emp.speech,
        message: task,
      }),
      signal: ac.signal,
    })
    const data = await res.json() as { result: string; model?: string }

    // 완료 시점에 다시 확인 — OFF면 결과 무시
    if (!useOfficeStore.getState().bgWorkerEnabled) {
      store.setEmpStatus(emp.id, 'idle')
      return
    }

    store.setEmpBubble(emp.id, `✅ ${task.slice(0, 10)}`, 200)
    store.setEmpStatus(emp.id, 'done')
    store.addSessionLog('main', 'employee', `[자율] ${emp.emoji} ${emp.name}(${emp.dept}): ${data.result}`)
    setTimeout(() => store.setEmpStatus(emp.id, 'idle'), 5000)
    store.setBgWorkerLastRun(Date.now())
  } catch {
    // abort 또는 네트워크 오류 — 무시
  } finally {
    _running = false
    _abortCtrl = null
  }
}

function startWorker() {
  // 이미 돌아가고 있으면 중복 시작 방지
  if (_intervalId) return

  _timeoutId = setTimeout(() => {
    if (!useOfficeStore.getState().bgWorkerEnabled) return
    runOnce()
  }, 15_000 + Math.random() * 25_000)

  _intervalId = setInterval(() => {
    if (!useOfficeStore.getState().bgWorkerEnabled) {
      stopWorker()
      return
    }
    runOnce()
  }, BG_INTERVAL)
}

export function useBackgroundWorker() {
  const enabled = useOfficeStore((s) => s.bgWorkerEnabled)

  useEffect(() => {
    if (enabled) {
      startWorker()
    } else {
      stopWorker()
    }
    return () => { stopWorker() }
  }, [enabled])
}
