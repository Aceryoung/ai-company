// components/CommandPanel.tsx — 대표 지시창
'use client'

import { useState, useRef, useEffect } from 'react'
import { useOfficeStore } from '../store/officeStore'

const QUICK_CMDS = ['현황 보고', '왜 늦어져?', '회의 소집', '레포 현황', '승인할게', '집중 모드']

interface Props {
  isMobile?: boolean
}

export function CommandPanel({ isMobile }: Props) {
  const { chatLog, addLog, waitingApproval } = useOfficeStore()
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
    handleCommand(cmd)
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
    } else if (lower.includes('레포') || lower.includes('github')) {
      resp = '[REPO] 고은채: Bewithus 144커밋🟢 / qbizerp 🟡 / familyproject🟢'
    } else if (lower.includes('승인')) {
      resp = waitingApproval
        ? '[꽁꽁(대표)] 승인!'
        : '[AIDE] 이수연: 현재 승인 대기 안건 없어요.'
    } else if (lower.includes('집중')) {
      resp = '[전원] 집중 모드 ON. 자리로 복귀합니다.'
    } else {
      resp = '[AIDE] 이수연: "현황 보고" "왜 늦어져?" "회의 소집" 또는 직원 이름을 입력해주세요.'
    }

    if (resp) setTimeout(() => addLog('employee', resp!), 400)
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
