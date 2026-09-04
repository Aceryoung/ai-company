// components/Pipeline.tsx — 8단계 GitHub 프로젝트 개선 파이프라인 (실제 연동)
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useOfficeStore, type Improvement, type PipelineState } from '../store/officeStore'
import { EMPLOYEES, REPOS, type RepoName } from '../data/employees'
import { useUsageTracker } from '../hooks/useUsageTracker'

// ── 8단계 정의
interface PipelineStep {
  num: number
  label: string
  icon: string
  desc: string
  leader: string
  dept: string
  color: string
}

const STEPS: PipelineStep[] = [
  { num: 1, label: 'REPO 스캔',    icon: '🔍', desc: 'GitHub 레포 구조·이슈·PR 스캔',         leader: '고은채', dept: '레포',     color: '#4af' },
  { num: 2, label: '개선점 추출',   icon: '📋', desc: '로컬 코드 분석 → 실제 개선 항목 도출',    leader: '고은채', dept: '레포',     color: '#4af' },
  { num: 3, label: '대표 승인',     icon: '👑', desc: '개선 항목 검토·선택·승인',               leader: '대표',   dept: '비서',     color: '#f80' },
  { num: 4, label: 'BUILD',        icon: '🛠️', desc: '브랜치 생성 → 코드 수정 → 커밋',         leader: '권민준', dept: '개발',     color: '#0f0' },
  { num: 5, label: 'RETRO',        icon: '📝', desc: '회고 작성 — 변경점·리스크·배운점',         leader: '황채은', dept: '회고',     color: '#ff6b6b' },
  { num: 6, label: 'GUARD',        icon: '🛡️', desc: '보안·품질 검수 — 취약점·성능·코드스멜',    leader: '장하윤', dept: '검수',     color: '#ffd43b' },
  { num: 7, label: 'OPS',          icon: '🚀', desc: '배포 준비 — 빌드·환경변수·git 상태 확인', leader: '강태오', dept: '운영',     color: '#9775fa' },
  { num: 8, label: 'PR 생성',      icon: '⚡', desc: '대표 확인 후 GitHub PR 생성 → 머지',     leader: '대표',   dept: '배포',     color: '#f80' },
]

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  perf:     { label: '성능',   color: '#4af' },
  sec:      { label: '보안',   color: '#f44' },
  feat:     { label: '기능',   color: '#0f0' },
  refactor: { label: '리팩터', color: '#9775fa' },
  doc:      { label: '문서',   color: '#6b8cbb' },
}

const PRIORITY_DOT: Record<string, string> = { high: '#f44', medium: '#ffa94d', low: '#6b8cbb' }

// API 호출 헬퍼
async function pipelineAPI(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch('/api/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  })
  return res.json()
}

export function Pipeline() {
  const { pipeline: _pipeline, setPipeline, setEmpStatus, setEmpBubble, addLog, limitHit, claudeLimits } = useOfficeStore()
  const pipeline = _pipeline as PipelineState
  const { logUsage } = useUsageTracker()
  const [loading, setLoading] = useState(false)
  const [scanData, setScanData] = useState<Record<string, unknown> | null>(null)
  const [buildResult, setBuildResult] = useState<Record<string, unknown> | null>(null)
  const [prResult, setPrResult] = useState<Record<string, unknown> | null>(null)
  const [mode, setMode] = useState<'improve' | 'develop'>('improve')
  const [devTask, setDevTask] = useState('')
  const [devPlan, setDevPlan] = useState<{ summary: string; steps: Array<{ title: string; description: string; files: string[]; action: string; prompt: string }>; risk: string } | null>(null)

  // AI 사용 가능 여부: 5시간 한도 80% 미만일 때만 AI 사용
  const canUseAI = claudeLimits.fiveHour.pct < 80

  const currentStep = pipeline.step

  // ── 이전 부서 done
  const doneStep = useCallback((stepIdx: number) => {
    const step = STEPS[stepIdx]
    for (const emp of EMPLOYEES) {
      if (emp.dept === step.dept) setEmpStatus(emp.id, 'done', '✅ 완료')
    }
  }, [setEmpStatus])

  // ── 부서 work 상태로
  const activateStep = useCallback((stepIdx: number) => {
    const step = STEPS[stepIdx]
    setPipeline({ step: stepIdx })
    for (const emp of EMPLOYEES) {
      if (emp.dept === step.dept) setEmpStatus(emp.id, 'work', step.desc)
    }
    const leader = EMPLOYEES.find(e => e.name === step.leader)
    if (leader) {
      setEmpBubble(leader.id, `${step.label} 진행 중...`, 300)
      addLog('employee', `[${step.dept}] ${step.leader}: ${step.label} 시작합니다!`)
    }
    addLog('sys', `${step.icon} STEP ${step.num}: ${step.label} — ${step.desc}`)
  }, [setPipeline, setEmpStatus, setEmpBubble, addLog])

  // ── STEP 0+1: 스캔 + 분석 (연속 실행)
  const runScanAndAnalyze = useCallback(async () => {
    const repo = pipeline.currentRepo
    if (!repo) return

    setLoading(true)
    activateStep(0)

    try {
      // STEP 0: GitHub API 스캔
      const scan = await pipelineAPI('scan', { repo })
      setScanData(scan)
      addLog('employee', `[레포] 고은채: ${scan.name} 스캔 완료 — 커밋 ${scan.commits?.length ?? 0}개, 이슈 ${scan.issues?.length ?? 0}개, PR ${scan.prs?.length ?? 0}개`)
      doneStep(0)

      // STEP 1: 로컬 코드 분석
      activateStep(1)
      const analysis = await pipelineAPI('analyze', { repo, useAI: canUseAI })

      const improvements: Improvement[] = (analysis.improvements || []).map((imp: Record<string, unknown>) => ({
        id: imp.id as string,
        title: imp.title as string,
        description: imp.description as string,
        type: imp.type as string,
        priority: imp.priority as string,
        effort: imp.effort as string,
        auto: imp.auto as boolean,
        files: imp.files as string[] | undefined,
        aiPrompt: imp.aiPrompt as string | undefined,
      }))

      setPipeline({
        scanResult: {
          summary: `${scan.name} — 파일 ${scan.local?.fileCount ?? '?'}개, 이슈 ${scan.issues?.length ?? 0}개, PR ${scan.prs?.length ?? 0}개`,
          improvements,
        },
      })
      addLog('employee', `[레포] 고은채: ${improvements.length}건 실제 개선점 도출 완료!${canUseAI ? ' (🤖 AI 분석 포함)' : ' (⚠️ 한도 부족 — AI 분석 건너뜀)'}`)
      doneStep(1)

      // STEP 2로 이동 (대표 승인 대기)
      activateStep(2)
      addLog('sys', '⏳ 대표님이 개선 항목을 검토·승인해야 합니다.')
    } catch (e: unknown) {
      const err = e as { message?: string }
      addLog('sys', `❌ 스캔 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [pipeline.currentRepo, activateStep, doneStep, addLog, setPipeline, canUseAI])

  // ── 개발 모드: 기획 + 구현
  const runDevPlanAndBuild = useCallback(async () => {
    const repo = pipeline.currentRepo
    if (!repo || !devTask.trim()) return

    setLoading(true)
    activateStep(0)
    addLog('boss', `💡 개발 지시: ${devTask}`)

    try {
      // STEP 0: 기획 수립
      addLog('employee', '[기획] 기획팀이 개발 계획을 수립합니다...')
      const planResult = await pipelineAPI('plan', { repo, task: devTask })
      if (planResult.error) { addLog('sys', `❌ 기획 실패: ${planResult.error}`); return }
      setDevPlan(planResult.plan)
      doneStep(0)

      // STEP 1: 설계 검토
      activateStep(1)
      const plan = planResult.plan
      addLog('employee', `[기획] 계획 완료: ${plan.summary} (${plan.steps.length}단계, 리스크: ${plan.risk})`)
      for (const s of plan.steps) addLog('sys', `  📋 ${s.title} — ${s.files.join(', ')}`)
      doneStep(1)

      // STEP 2: 대표 승인 대기
      activateStep(2)
      addLog('sys', '⏳ 대표님이 개발 계획을 검토·승인해야 합니다.')
    } catch (e: unknown) {
      addLog('sys', `❌ 기획 실패: ${(e as { message?: string }).message}`)
    } finally {
      setLoading(false)
    }
  }, [pipeline.currentRepo, devTask, activateStep, doneStep, addLog])

  const runDevBuild = useCallback(async () => {
    if (!devPlan || !pipeline.currentRepo) return
    setLoading(true)
    activateStep(3)

    try {
      addLog('employee', '[개발] 개발팀이 구현을 시작합니다...')
      const result = await pipelineAPI('develop', { repo: pipeline.currentRepo, steps: devPlan.steps })
      setBuildResult(result)

      const doneCount = (result.results || []).filter((r: Record<string, unknown>) => r.status === 'done').length
      const skipCount = (result.results || []).filter((r: Record<string, unknown>) => r.status === 'skipped').length
      addLog('employee', `[개발] 구현 완료 — ${doneCount}건 완료, ${skipCount}건 스킵`)
      doneStep(3)

      // RETRO
      activateStep(4)
      const retro = `변경점 ${doneCount}건 · 스킵 ${skipCount}건 · 브랜치: ${result.branch || 'N/A'}`
      setPipeline({ retroResult: retro })
      addLog('employee', `[회고] 황세은: ${retro}`)
      doneStep(4)

      // GUARD
      activateStep(5)
      const guard = await pipelineAPI('guard', { repo: pipeline.currentRepo })
      setPipeline({ guardResult: guard })
      addLog('employee', `[검수] 장하윤: ${guard.passed ? '검수 통과! 🛡️' : '⛔ 검수 반려 — ' + guard.issues[0]}`)
      doneStep(5)

      // OPS
      activateStep(6)
      const ops = await pipelineAPI('ops', { repo: pipeline.currentRepo })
      setPipeline({ opsResult: ops })
      addLog('employee', `[운영] 강태오: ${ops.ready ? '배포 준비 완료!' : '⚠️ 배포 준비 미완료'}`)
      doneStep(6)

      // PR 대기
      activateStep(7)
      if (!guard.passed) {
        addLog('sys', `⛔ GUARD 검수 반려 — PR 생성 차단. 리셋 후 코드 수정 필요.`)
      } else if (result.branch) {
        addLog('sys', `⚡ 대표님이 PR 생성을 승인해야 합니다. 브랜치: ${result.branch}`)
      } else {
        addLog('sys', '변경사항 없음 — PR 생성 불필요.')
      }
    } catch (e: unknown) {
      addLog('sys', `❌ 개발 실패: ${(e as { message?: string }).message}`)
    } finally {
      setLoading(false)
    }
  }, [devPlan, pipeline.currentRepo, activateStep, doneStep, addLog, setPipeline])

  // ── STEP 3: BUILD (실제 브랜치 + 코드 수정)
  const runBuild = useCallback(async (items: Improvement[]) => {
    setLoading(true)
    activateStep(3)

    try {
      const result = await pipelineAPI('build', {
        repo: pipeline.currentRepo,
        improvements: items.map(i => ({ ...i, auto: i.auto ?? false })),
        useAI: canUseAI,
      })
      setBuildResult(result)

      const doneCount = (result.results || []).filter((r: Record<string, unknown>) => r.status === 'done').length
      const skipCount = (result.results || []).filter((r: Record<string, unknown>) => r.status === 'skipped').length

      setPipeline({ buildResult: result.branch
        ? `브랜치 ${result.branch} — ${doneCount}건 수정, ${skipCount}건 스킵 — 커밋 ${result.commit}`
        : `변경사항 없음 (${skipCount}건 모두 스킵)`
      })

      if (result.branch) {
        addLog('employee', `[개발] 권민준: 브랜치 ${result.branch} 생성, ${doneCount}건 코드 수정 완료!`)
      } else {
        addLog('employee', '[개발] 권민준: 자동 수정 가능한 항목 없음 — 수동 작업 필요')
      }

      doneStep(3)

      // STEP 4: RETRO (간단 자동)
      activateStep(4)
      const retroText = `변경점 ${doneCount}건 · 스킵 ${skipCount}건 · 브랜치: ${result.branch || 'N/A'}`
      setPipeline({ retroResult: retroText })
      addLog('employee', '[회고] 황채은: 회고 리포트 작성 완료!')
      doneStep(4)

      // STEP 5: GUARD (실제 검수)
      activateStep(5)
      const guard = await pipelineAPI('guard', { repo: pipeline.currentRepo })
      setPipeline({ guardResult: guard })
      addLog('employee', `[검수] 장하윤: ${guard.passed ? '검수 통과! 🛡️' : '⛔ 검수 반려 — ' + guard.issues[0]}`)
      doneStep(5)

      // STEP 6: OPS (실제 체크)
      activateStep(6)
      const ops = await pipelineAPI('ops', { repo: pipeline.currentRepo })
      setPipeline({ opsResult: ops })
      addLog('employee', `[운영] 강태오: ${ops.ready ? '배포 준비 완료!' : '⚠️ 배포 준비 미완료'}`)
      doneStep(6)

      // STEP 7: PR 생성 대기
      activateStep(7)
      if (!guard.passed) {
        addLog('sys', `⛔ GUARD 검수 반려 — PR 생성 차단. 이슈: ${guard.issues.join(', ')}. 리셋 후 수동 수정 필요.`)
      } else if (result.branch) {
        addLog('sys', `⚡ 대표님이 PR 생성을 승인해야 합니다. 브랜치: ${result.branch}`)
      } else {
        addLog('sys', '변경사항 없음 — PR 생성 불필요. 파이프라인을 리셋하세요.')
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      addLog('sys', `❌ BUILD 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [pipeline.currentRepo, activateStep, doneStep, addLog, setPipeline])

  // ── STEP 2: 승인
  const approveItems = (items: Improvement[]) => {
    setPipeline({ selectedItems: items })
    addLog('boss', `${items.length}건 승인 완료!`)
    addLog('sys', `✅ 대표 승인 — ${items.map(i => i.title).join(', ')}`)
    doneStep(2)
    runBuild(items)
  }

  // ── STEP 7: PR 생성
  const executePush = async () => {
    if (!buildResult || !(buildResult as Record<string, unknown>).branch) return
    setLoading(true)
    addLog('boss', '🚀 PR 생성 승인!')

    try {
      const result = await pipelineAPI('push', {
        repo: pipeline.currentRepo,
        branch: (buildResult as Record<string, unknown>).branch,
        improvements: pipeline.selectedItems,
      })
      setPrResult(result)

      if (result.prUrl) {
        addLog('sys', `✅ PR 생성 완료! → ${result.prUrl}`)
        addLog('employee', `[레포] 고은채: PR 올렸어요! 대표님이 머지해주세요. ${result.prUrl}`)
      } else {
        addLog('sys', `PR 생성 결과: ${result.output || result.error}`)
      }

      doneStep(7)
      setPipeline({ stopped: true, savedAt: Date.now() })
      for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'done', '🎉 PR 완료!')
    } catch (e: unknown) {
      const err = e as { message?: string }
      addLog('sys', `❌ PR 생성 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── 파이프라인 시작
  const startPipeline = (repo: string) => {
    setPipeline({
      currentRepo: repo, step: 0, stopped: false,
      scanResult: null, selectedItems: [], buildResult: '',
      retroResult: '', guardResult: null, opsResult: null, savedAt: null,
    })
    setScanData(null)
    setBuildResult(null)
    setPrResult(null)
    for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'idle')
    addLog('sys', `🔗 ${mode === 'develop' ? '개발' : '개선'} 파이프라인 시작 — 레포: ${repo}`)
    logUsage('pipeline', `파이프라인 시작 (${mode}): ${repo}`)
    setDevPlan(null)
    setDevTask('')
  }

  // startPipeline 후 자동으로 스캔 시작 (개선 모드만)
  useEffect(() => {
    if (mode === 'improve' && pipeline.currentRepo && pipeline.step === 0 && !pipeline.scanResult && !loading && !pipeline.stopped) {
      runScanAndAnalyze()
    }
  }, [mode, pipeline.currentRepo, pipeline.step, pipeline.scanResult, loading, pipeline.stopped, runScanAndAnalyze])

  // ── 리셋
  const resetPipeline = () => {
    setPipeline({
      currentRepo: null, step: 0, stopped: false,
      scanResult: null, selectedItems: [], buildResult: '',
      retroResult: '', guardResult: null, opsResult: null, savedAt: null,
    })
    setScanData(null)
    setBuildResult(null)
    setPrResult(null)
    for (const emp of EMPLOYEES) setEmpStatus(emp.id, 'idle')
    addLog('sys', '🔄 파이프라인 초기화')
  }

  // 한도 소진
  useEffect(() => {
    if (limitHit) {
      setPipeline({ stopped: true })
      addLog('sys', '⚠️ 한도 소진 — 파이프라인 일시 중단')
    }
  }, [limitHit, setPipeline, addLog])

  const isWaitingApproval = currentStep === 2 && pipeline.scanResult && pipeline.selectedItems.length === 0 && !pipeline.stopped && !loading
  const isWaitingDevInput = mode === 'develop' && pipeline.currentRepo && currentStep === 0 && !loading && !pipeline.stopped
  const isWaitingDevApproval = mode === 'develop' && currentStep === 2 && devPlan && pipeline.selectedItems.length === 0 && !loading && !pipeline.stopped
  const isWaitingPush = currentStep === 7 && !pipeline.stopped && !loading
  const hasBranch = buildResult && (buildResult as Record<string, unknown>).branch

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#4af]">🔗 GitHub {mode === 'improve' ? '개선' : '개발'} 파이프라인 {loading && <span className="animate-pulse text-[#f80]">⚙️ 실행 중...</span>}</h2>
        {pipeline.currentRepo && (
          <button
            onClick={resetPipeline}
            disabled={loading}
            className="px-3 py-1.5 text-[11px] font-bold bg-[#1a0800] border border-[#f80] text-[#f80] rounded hover:bg-[#2a1000] transition-colors disabled:opacity-40"
          >
            ⏹ 리셋
          </button>
        )}
      </div>

      {/* 모드 토글 */}
      {!pipeline.currentRepo && (
        <div className="flex gap-2">
          <button onClick={() => setMode('improve')} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded border transition-all ${mode === 'improve' ? 'bg-[#0a2a0a] border-[#0f0] text-[#0f0]' : 'bg-[#0a1628] border-[#1e3a5f] text-[#6b8cbb] hover:border-[#4af]'}`}>
            🔧 개선 모드 <span className="text-[8px] opacity-60">코드 분석·자동 수정</span>
          </button>
          <button onClick={() => setMode('develop')} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded border transition-all ${mode === 'develop' ? 'bg-[#1a0a2a] border-[#a78bfa] text-[#a78bfa]' : 'bg-[#0a1628] border-[#1e3a5f] text-[#6b8cbb] hover:border-[#4af]'}`}>
            🚀 개발 모드 <span className="text-[8px] opacity-60">새 기능 개발·구현</span>
          </button>
        </div>
      )}

      {/* 프로젝트 선택 */}
      {!pipeline.currentRepo && (
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3 space-y-2">
          <div className="text-[10px] text-[#6b8cbb] font-bold mb-2">📦 프로젝트 선택 — 실제 GitHub 연동</div>
          {(Object.keys(REPOS) as RepoName[]).map(key => {
            const repo = REPOS[key]
            return (
              <button
                key={key}
                onClick={() => startPipeline(repo.full)}
                className="w-full flex items-start gap-3 px-3 py-2.5 bg-[#0d1f30] border border-[#1e3a5f] rounded-lg hover:border-[#4af] hover:bg-[#0a2040] transition-all text-left group"
              >
                <span className="text-lg mt-0.5">📂</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-[#4af]">{repo.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#4af15] text-[#4af] border border-[#4af30]">{repo.stack}</span>
                  </div>
                  <div className="text-[10px] text-[#6b8cbb] mt-0.5">{repo.desc}</div>
                  <div className="text-[9px] text-[#4a6fa5] mt-0.5 font-mono">{repo.full}</div>
                </div>
                <span className="text-[10px] text-[#0f0] opacity-0 group-hover:opacity-100 transition-opacity mt-1">▶ 시작</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 레포 정보 */}
      {pipeline.currentRepo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg">
          <span className="text-xs">📦</span>
          <span className="text-xs font-mono text-[#4af]">{pipeline.currentRepo}</span>
          {scanData && (
            <span className="text-[9px] text-[#6b8cbb]">
              · ⭐{String((scanData as Record<string, unknown>).stars)} · 이슈 {String(((scanData as Record<string, unknown>).issues as unknown[])?.length ?? 0)}
            </span>
          )}
          <span className="ml-auto text-[10px] text-[#6b8cbb]">
            {pipeline.stopped && pipeline.savedAt ? '✅ 완료' : `STEP ${currentStep + 1}/8`}
          </span>
        </div>
      )}

      {/* 스캔 결과 상세 */}
      {scanData && !pipeline.stopped && (
        <div className="bg-[#0a1020] border border-[#1e3a5f] rounded-lg p-2 text-[10px] text-[#6b8cbb]">
          <div className="flex gap-4 mb-1">
            <span>📁 파일 {String((scanData as Record<string, Record<string, unknown>>).local?.fileCount ?? '?')}개</span>
            <span>🔀 브랜치: {String((scanData as Record<string, Record<string, unknown>>).local?.branch ?? '')}</span>
            <span>{(scanData as Record<string, Record<string, unknown>>).local?.dirty ? '⚠️ 미커밋 변경 있음' : '✅ 클린'}</span>
          </div>
          <div className="text-[9px]">
            최근 커밋: {((scanData as Record<string, unknown>).commits as Array<Record<string, string>>)?.[0]?.message?.slice(0, 50)}
          </div>
        </div>
      )}

      {/* 개발 모드: 태스크 입력 */}
      {isWaitingDevInput && (
        <div className="bg-[#1a0a2a] border border-[#a78bfa] rounded-lg p-3 space-y-2">
          <div className="text-[10px] text-[#a78bfa] font-bold">🚀 개발 지시 입력 — AI가 기획 → 구현 → PR 생성</div>
          <textarea
            value={devTask}
            onChange={e => setDevTask(e.target.value)}
            placeholder="예: 로그인 페이지 추가, 다크모드 지원, API 에러 핸들링 개선..."
            className="w-full h-16 px-2 py-1.5 text-[11px] bg-[#0a0520] border border-[#a78bfa50] rounded text-white placeholder-[#6b5ca5] resize-none focus:outline-none focus:border-[#a78bfa]"
          />
          <div className="flex gap-2">
            <button
              onClick={runDevPlanAndBuild}
              disabled={!devTask.trim() || !canUseAI}
              className="flex-1 px-3 py-2 text-[11px] font-bold bg-gradient-to-r from-[#1a0a2a] to-[#0a1a2a] border border-[#a78bfa] text-[#a78bfa] rounded hover:bg-[#2a1a3a] transition-all disabled:opacity-40"
            >
              🤖 AI 기획 시작 {!canUseAI && '(한도 부족)'}
            </button>
          </div>
        </div>
      )}

      {/* 개발 모드: 기획 승인 대기 */}
      {isWaitingDevApproval && devPlan && (
        <div className="bg-[#1a0a2a] border border-[#a78bfa] rounded-lg p-3 space-y-2">
          <div className="text-[10px] text-[#a78bfa] font-bold">📋 개발 계획 — {devPlan.summary}</div>
          <div className="text-[9px] text-[#6b8cbb]">리스크: <span className={devPlan.risk === 'high' ? 'text-[#f44]' : devPlan.risk === 'medium' ? 'text-[#f80]' : 'text-[#0f0]'}>{devPlan.risk}</span></div>
          {devPlan.steps.map((s, j) => (
            <div key={j} className="bg-[#0a0520] border border-[#a78bfa30] rounded p-2">
              <div className="text-[10px] text-white font-bold">{j + 1}. {s.title}</div>
              <div className="text-[9px] text-[#6b8cbb] mt-0.5">{s.description}</div>
              <div className="text-[8px] text-[#a78bfa] mt-0.5 font-mono">{s.files.join(', ')} ({s.action})</div>
            </div>
          ))}
          <button
            onClick={() => { setPipeline({ selectedItems: [] }); runDevBuild() }}
            className="w-full px-3 py-2 text-[11px] font-bold bg-gradient-to-r from-[#0a2a0a] to-[#1a0a2a] border border-[#0f0] text-[#0f0] rounded hover:bg-[#1a3a1a] transition-all animate-pulse"
          >
            👑 개발 승인 — {devPlan.steps.length}단계 구현 시작
          </button>
        </div>
      )}

      {/* 진행률 */}
      {pipeline.currentRepo && (
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700 rounded-full"
                style={{
                  width: `${pipeline.stopped && pipeline.savedAt ? 100 : ((currentStep) / STEPS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #4af 0%, #0f0 50%, #f80 100%)',
                }}
              />
            </div>
            <span className="text-[10px] text-[#6b8cbb] shrink-0">
              {pipeline.stopped && pipeline.savedAt ? '8' : currentStep}/{STEPS.length}
            </span>
          </div>
        </div>
      )}

      {/* 8단계 타임라인 */}
      {pipeline.currentRepo && (
        <div className="flex flex-col gap-1">
          {STEPS.map((step, i) => {
            const isCurrent = i === currentStep && !pipeline.stopped
            const isDone: boolean = i < currentStep || (pipeline.stopped && pipeline.savedAt !== null)

            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                  isDone
                    ? 'bg-[#001a00] border-[#0f0]/30 text-[#0f0]'
                    : isCurrent
                    ? 'bg-[#0a1628] border-[#4af] text-white'
                    : 'bg-[#0a0e1a] border-[#1e3a5f]/50 text-[#4a6fa5]'
                }`}
              >
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 ${
                      isDone ? 'border-[#0f0] bg-[#002a00]'
                      : isCurrent ? 'border-[#4af] bg-[#0a2040] animate-pulse'
                      : 'border-[#1e3a5f] bg-[#0a0e1a]'
                    }`}
                  >
                    {isDone ? '✅' : isCurrent && loading ? '⏳' : step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-0.5 h-4 mt-0.5 ${isDone ? 'bg-[#0f0]/40' : 'bg-[#1e3a5f]/40'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isCurrent ? 'text-white' : ''}`}>{step.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                      background: `${step.color}15`,
                      color: step.color,
                      border: `1px solid ${step.color}30`,
                    }}>
                      {step.leader}
                    </span>
                    {isCurrent && loading && (
                      <span className="text-[9px] text-[#f80] animate-pulse">실행 중...</span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-60 mt-0.5">{step.desc}</div>

                  {/* 단계별 결과 */}
                  {isDone && i === 0 && pipeline.scanResult ? (
                    <div className="mt-1.5 text-[10px] text-[#6b8cbb] bg-[#0a1020] rounded px-2 py-1">
                      {pipeline.scanResult.summary}
                    </div>
                  ) : null}

                  {isDone && i === 1 && pipeline.scanResult ? (
                    <div className="mt-1.5 text-[10px] text-[#6b8cbb]">
                      📋 {pipeline.scanResult.improvements.length}건 실제 개선점 도출
                    </div>
                  ) : null}

                  {isDone && i === 2 && pipeline.selectedItems.length > 0 ? (
                    <div className="mt-1.5 text-[10px] text-[#f80]">
                      👑 {pipeline.selectedItems.length}건 승인됨
                    </div>
                  ) : null}

                  {isDone && i === 3 && pipeline.buildResult ? (
                    <div className="mt-1.5 text-[10px] text-[#0f0] bg-[#001a00] rounded px-2 py-1">
                      {String(pipeline.buildResult)}
                    </div>
                  ) : null}

                  {isDone && i === 3 && buildResult && (buildResult as Record<string, unknown>).results ? (
                    <div className="mt-1 space-y-0.5">
                      {((buildResult as Record<string, unknown>).results as Array<Record<string, string>>).map((r, j) => (
                        <div key={j} className={`text-[9px] ${r.status === 'done' ? 'text-[#0f0]' : 'text-[#6b8cbb]'}`}>
                          {r.status === 'done' ? '✅' : '⏭️'} {r.title} — {r.detail}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {isDone && i === 4 && pipeline.retroResult ? (
                    <div className="mt-1.5 text-[10px] text-[#ff6b6b]">
                      📝 {String(pipeline.retroResult)}
                    </div>
                  ) : null}

                  {isDone && i === 5 && pipeline.guardResult ? (
                    <div className="mt-1.5">
                      <div className={`text-[10px] ${pipeline.guardResult.passed ? 'text-[#0f0]' : 'text-[#f44]'}`}>
                        🛡️ {pipeline.guardResult.summary}
                      </div>
                      {pipeline.guardResult.issues.map((issue: string, j: number) => (
                        <div key={j} className="text-[9px] text-[#ffa94d] mt-0.5">{issue}</div>
                      ))}
                    </div>
                  ) : null}

                  {isDone && i === 6 && pipeline.opsResult ? (
                    <div className="mt-1.5 text-[10px] text-[#9775fa]">
                      {pipeline.opsResult.checklist.map((c: string, j: number) => (
                        <div key={j}>{c}</div>
                      ))}
                    </div>
                  ) : null}

                  {/* 승인 대기 UI (Step 2) */}
                  {isCurrent && isWaitingApproval && pipeline.scanResult ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="text-[10px] text-[#f80] font-bold">📋 실제 개선 항목 검토:</div>
                      {pipeline.scanResult.improvements.map(imp => (
                        <div key={imp.id} className="flex items-center gap-2 px-2 py-1.5 bg-[#0d1f30] rounded border border-[#1e3a5f]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_DOT[imp.priority] }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-white font-medium truncate">{imp.title}</span>
                              {imp.auto ? (
                                <span className="text-[8px] px-1 rounded bg-[#0f020] text-[#0f0] border border-[#0f030]">자동</span>
                              ) : null}
                            </div>
                            <div className="text-[9px] text-[#6b8cbb]">{imp.description}</div>
                          </div>
                          <span className="text-[9px] px-1 rounded" style={{
                            background: `${TYPE_LABEL[imp.type]?.color}20`,
                            color: TYPE_LABEL[imp.type]?.color,
                          }}>
                            {TYPE_LABEL[imp.type]?.label}
                          </span>
                        </div>
                      ))}
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => approveItems(pipeline.scanResult!.improvements)}
                          className="flex-1 px-2 py-1.5 text-[10px] font-bold bg-[#1a0800] border border-[#f80] text-[#f80] rounded hover:bg-[#2a1000] transition-colors"
                        >
                          👑 전체 승인 ({pipeline.scanResult.improvements.length}건)
                        </button>
                        <button
                          onClick={() => approveItems(pipeline.scanResult!.improvements.filter(i => i.priority === 'high'))}
                          className="px-2 py-1.5 text-[10px] font-bold bg-[#1a0000] border border-[#f44] text-[#f44] rounded hover:bg-[#2a0000] transition-colors"
                        >
                          🔥 High만
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* PR 생성 대기 UI (Step 7) */}
                  {isCurrent && isWaitingPush ? (
                    <div className="mt-2">
                      {pipeline.guardResult && !pipeline.guardResult.passed ? (
                        <div className="text-[10px] text-[#f44] text-center py-2 border border-[#f44]/30 rounded bg-[#1a0000]">
                          ⛔ GUARD 검수 반려 — PR 생성 차단됨. 리셋 후 코드 수정 필요.
                        </div>
                      ) : hasBranch ? (
                        <button
                          onClick={executePush}
                          disabled={loading}
                          className="w-full px-3 py-2 text-[11px] font-bold bg-gradient-to-r from-[#1a0800] to-[#001a00] border border-[#f80] text-[#f80] rounded hover:border-[#0f0] hover:text-[#0f0] transition-all animate-pulse disabled:opacity-40"
                        >
                          ⚡ gh pr create → GitHub PR 생성
                        </button>
                      ) : (
                        <div className="text-[10px] text-[#6b8cbb] text-center py-2">
                          변경사항 없음 — PR 생성 불필요
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 완료 배너 */}
      {pipeline.stopped && pipeline.savedAt ? (
        <div className="bg-[#001a00] border border-[#0f0]/40 rounded-lg p-3 text-center">
          <div className="text-sm font-bold text-[#0f0]">🎉 파이프라인 완료!</div>
          {prResult && (prResult as Record<string, unknown>).prUrl ? (
            <a
              href={(prResult as Record<string, unknown>).prUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#4af] underline mt-1 block"
            >
              📎 {String((prResult as Record<string, unknown>).prUrl)}
            </a>
          ) : null}
          <div className="text-[10px] text-[#6b8cbb] mt-1">
            {new Date(pipeline.savedAt).toLocaleString('ko-KR')}
          </div>
        </div>
      ) : null}
    </div>
  )
}
