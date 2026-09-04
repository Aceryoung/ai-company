// components/CommandPanel.tsx — 대표 지시창
'use client'

import { useState, useRef, useEffect } from 'react'
import { useOfficeStore } from '../store/officeStore'
import { EMPLOYEES, DEPT_SKILLS, getEmployeesByDept } from '../data/employees'
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
}

interface Props {
  isMobile?: boolean
}

export function CommandPanel({ isMobile }: Props) {
  const { chatLog, addLog, waitingApproval } = useOfficeStore()
  const { logUsage } = useUsageTracker()
  const [input, setInput] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [chatLog])

  const send = (preset?: string) => {
    const cmd = preset ?? input.trim()
    if (!cmd) return
    setInput('')
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
      resp = '[AIDE] 이수연: 팀장 전원 회의실 집결합니다!'
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
    <div className="flex flex-col h-full min-h-0">
      {/* 타이틀 — 데스크톱 사이드바만 */}
      {!isMobile && (
        <div className="px-3 py-2.5 text-sm font-bold text-[#4af] border-b-2 border-[#1e3a5f] shrink-0">
          💬 대표 지시창
        </div>
      )}

      {/* 퀵버튼 */}
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

      {/* 채팅 로그 */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 min-h-0"
      >
        {chatLog.map((m, i) => (
          <div
            key={i}
            className={`text-xs leading-relaxed ${
              m.type === 'boss' ? 'text-[#4af]'
              : m.type === 'employee' ? 'text-[#6ef]'
              : 'text-[#6b8cbb] italic'
            }`}
          >
            {m.type === 'boss' && <span className="font-bold text-white">꽁꽁(대표): </span>}
            {m.text}
          </div>
        ))}
        {chatLog.length === 0 && (
          <p className="text-xs text-[#6b8cbb] italic">지시창 대기 중…</p>
        )}
      </div>

      {/* 입력 */}
      <div className="flex gap-1.5 p-2 border-t-2 border-[#1e3a5f] shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="지시 입력…"
          className="flex-1 px-3 py-2 bg-[#0a0e1a] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded outline-none focus:border-[#4af] placeholder:text-[#4a6fa5]"
        />
        <button
          onClick={() => send()}
          className="px-3 py-2 bg-[#4af] text-black text-xs font-bold rounded hover:bg-[#7bf] transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  )
}
