"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectStatus } from "@/lib/projects";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE,
  PROJECT_STATUS_NEXT,
  PROJECT_CATEGORY_LABELS,
  PROJECT_CATEGORY_BADGE,
} from "@/lib/projects";
import type { Client } from "@/lib/clients";
import type { Transaction } from "@/lib/transactions";
import { getBadge } from "@/lib/transactions";
import { Spinner } from "@/components/Spinner";
import { Toast, useToast } from "@/components/Toast";
import ProjectLogs from "./ProjectLogs";

type Props = {
  project: Project;
  client: Client | null;
  transactions: Transaction[];
};

export default function ProjectDetail({ project: initialProject, client, transactions: initialTransactions }: Props) {
  const { toast, showToast } = useToast();
  const [project, setProject] = useState(initialProject);
  const [advancing, setAdvancing] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);

  // 기존 거래 연결 모달
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinked, setUnlinked] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [linking, setLinking] = useState(false);

  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const expense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const profit = income - expense;

  const nextStatus = PROJECT_STATUS_NEXT[project.status];

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    setAdvancing(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update({ status: nextStatus })
      .eq("id", project.id)
      .eq("status", project.status);
    setAdvancing(false);

    if (error) {
      showToast("상태 변경에 실패했어요", "error");
      return;
    }

    setProject((prev) => ({ ...prev, status: nextStatus }));
    showToast(`${PROJECT_STATUS_LABELS[nextStatus]}으로 변경됐습니다`, "success");
  };

  const handleOpenLink = async () => {
    setLinkOpen(true);
    setSelected(new Set());
    setLoadingUnlinked(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .or(`project_id.is.null,project_id.neq.${project.id}`)
      .order("transaction_date", { ascending: false });
    setUnlinked((data as Transaction[]) ?? []);
    setLoadingUnlinked(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    setLinking(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .update({ project_id: project.id })
      .in("id", Array.from(selected));
    setLinking(false);

    if (error) {
      showToast("연결에 실패했어요", "error");
      return;
    }

    const linked = unlinked.filter((tx) => selected.has(tx.id)).map((tx) => ({ ...tx, project_id: project.id }));
    setTransactions((prev) => [...prev, ...linked]);
    setLinkOpen(false);
    showToast(`${selected.size}건 연결됐습니다`, "success");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-500 text-sm">←</Link>
          <h1 className="text-base font-bold text-gray-900 truncate max-w-[180px]">{project.name}</h1>
        </div>
        <Link href={`/projects/${project.id}/edit`} className="text-sm text-[#26A69A] font-medium">
          수정
        </Link>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${PROJECT_CATEGORY_BADGE[project.category ?? "personal"]}`}
              >
                {PROJECT_CATEGORY_LABELS[project.category ?? "personal"]}
              </span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${PROJECT_STATUS_BADGE[project.status]}`}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            {nextStatus && (
              <button
                type="button"
                onClick={handleAdvanceStatus}
                disabled={advancing}
                className="flex items-center gap-1.5 text-xs font-medium text-[#26A69A] bg-[#cdfaf6] px-3 py-1.5 rounded-lg disabled:opacity-40"
              >
                {advancing && <Spinner />}
                {PROJECT_STATUS_LABELS[nextStatus]}으로 변경
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-sm">
            {client && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-20 shrink-0">클라이언트</span>
                <Link href={`/clients/${client.id}`} className="text-[#26A69A] font-medium">
                  {client.name}
                </Link>
              </div>
            )}
            {project.estimated_amount != null && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-20 shrink-0">예상금액</span>
                <span className="text-gray-900 font-semibold">
                  {project.estimated_amount.toLocaleString()}원
                </span>
              </div>
            )}
            {project.start_date && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-20 shrink-0">시작일</span>
                <span className="text-gray-700">{project.start_date}</span>
              </div>
            )}
            {project.end_date && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-20 shrink-0">종료일</span>
                <span className="text-gray-700">{project.end_date}</span>
              </div>
            )}
            {project.memo && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-20 shrink-0">메모</span>
                <span className="text-gray-700 whitespace-pre-wrap">{project.memo}</span>
              </div>
            )}
          </div>
        </div>

        {/* P&L 요약 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">손익 요약</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">매출</p>
              <p className="text-base font-semibold text-[#26A69A]">{income.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">매입</p>
              <p className="text-base font-semibold text-gray-700">{expense.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">순익</p>
              <p className={`text-base font-bold ${profit >= 0 ? "text-[#5f9428]" : "text-[#e85b8a]"}`}>
                {profit > 0 ? "+" : ""}{profit.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 연결된 거래 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">연결된 거래 ({transactions.length})</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenLink}
                className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-lg"
              >
                기존 거래 연결
              </button>
              <Link
                href={`/transactions/new?project_id=${project.id}`}
                className="text-xs text-[#26A69A] font-medium bg-[#cdfaf6] px-2.5 py-1 rounded-lg"
              >
                + 거래 추가
              </Link>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-400">아직 연결된 거래가 없습니다</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {transactions.map((tx) => {
                  const badge = getBadge(tx);
                  return (
                    <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-gray-900">{tx.counterparty}</span>
                        <span className="text-xs text-gray-400">{tx.transaction_date}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-semibold ${tx.type === "income" ? "text-[#26A69A]" : "text-gray-900"}`}>
                          {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원
                        </span>
                        <span className={badge.className}>{badge.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 개발일지 */}
        <ProjectLogs projectId={project.id} />
      </div>

      {/* 기존 거래 연결 모달 */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={() => setLinkOpen(false)}>
          <div
            className="mt-auto bg-white rounded-t-2xl max-h-[80dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">기존 거래 연결</p>
              <button type="button" onClick={() => setLinkOpen(false)} className="text-gray-400 text-lg leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingUnlinked ? (
                <div className="flex items-center justify-center py-10"><Spinner /></div>
              ) : unlinked.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">연결 가능한 거래가 없습니다</p>
                  <p className="text-xs text-gray-300 mt-1">이미 프로젝트에 연결된 거래는 표시되지 않아요</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {unlinked.map((tx) => {
                    const badge = getBadge(tx);
                    const isSelected = selected.has(tx.id);
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => toggleSelect(tx.id)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${isSelected ? "bg-[#f0fdfb]" : ""}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? "bg-[#26A69A] border-[#26A69A]" : "border-gray-300"}`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-gray-900">{tx.counterparty}</span>
                            <span className="text-xs text-gray-400">
                              {tx.transaction_date}
                              {tx.project_id && tx.project_id !== project.id && (
                                <span className="ml-1.5 text-amber-500">· 다른 프로젝트 연결됨</span>
                              )}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-semibold ${tx.type === "income" ? "text-[#26A69A]" : "text-gray-900"}`}>
                              {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원
                            </span>
                            <span className={badge.className}>{badge.label}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleLink}
                disabled={selected.size === 0 || linking}
                className="w-full bg-[#26A69A] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {linking && <Spinner />}
                {selected.size > 0 ? `${selected.size}건 연결하기` : "거래를 선택해주세요"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
