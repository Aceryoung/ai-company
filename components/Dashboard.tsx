"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";
import { getBadge, type Transaction } from "@/lib/transactions";

type ViewState = "loading" | "error" | "success";

type Props = {
  initialTransactions: Transaction[];
  initialError: boolean;
};

function currentMonthRangeKST() {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })
    .format(new Date())
    .split("-")
    .map(Number);

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = `${nextYear}-${pad(nextMonth)}-01`;

  return { start, end };
}

export default function Dashboard({ initialTransactions, initialError }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [state, setState] = useState<ViewState>(initialError ? "error" : "success");

  const fetchTransactions = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    if (error) {
      setState("error");
      return;
    }

    setTransactions(data ?? []);
    setState("success");
  }, []);

  const handleRetry = () => {
    setState("loading");
    fetchTransactions();
  };

  if (state === "loading") {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <Skeleton />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <Skeleton />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <Skeleton />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
              <Skeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center space-y-3">
        <p className="text-sm text-gray-700">불러오지 못했습니다</p>
        <button
          type="button"
          onClick={handleRetry}
          className="text-[#26A69A] bg-[#cdfaf6] text-xs font-medium px-3 py-1.5 rounded-lg active:bg-[#D0EBEA] transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { start, end } = currentMonthRangeKST();
  const monthly = transactions.filter(
    (tx) => tx.transaction_date >= start && tx.transaction_date < end,
  );
  const monthlyIncome = monthly
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyExpense = monthly
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const profit = monthlyIncome - monthlyExpense;
  const arTotal = transactions
    .filter((tx) => tx.type === "income" && !tx.is_completed)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const recent = transactions.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm text-gray-500 mb-1">이번 달 순익</p>
        <p className={`text-3xl font-bold ${profit >= 0 ? "text-[#5f9428]" : "text-[#e85b8a]"}`}>
          {profit > 0 ? "+" : ""}
          {profit.toLocaleString()}원
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">매출</p>
          <p className="text-xl font-semibold text-gray-900">{monthlyIncome.toLocaleString()}원</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">매입</p>
          <p className="text-xl font-semibold text-gray-900">{monthlyExpense.toLocaleString()}원</p>
        </div>
      </div>

      <div className="bg-[#fde8f0] rounded-2xl p-4">
        <p className="text-sm text-[#e85b8a] mb-1">⚠ 미수금 합계</p>
        <p className="text-xl font-semibold text-[#e85b8a]">{arTotal.toLocaleString()}원</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <p className="text-sm font-semibold text-gray-900 px-4 pt-4 pb-2">최근 거래</p>
        {recent.length === 0 ? (
          <div className="px-4 pb-4 text-center space-y-3">
            <p className="text-sm text-gray-500">아직 거래가 없습니다</p>
            <Link
              href="/transactions/new"
              className="inline-block text-[#26A69A] bg-[#cdfaf6] text-xs font-medium px-3 py-1.5 rounded-lg active:bg-[#D0EBEA] transition-colors"
            >
              거래 입력하러 가기
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((tx) => {
              const badge = getBadge(tx);
              return (
                <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900">{tx.counterparty}</span>
                    <span className="text-xs text-gray-400">{tx.transaction_date}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {tx.amount.toLocaleString()}원
                    </span>
                    <span className={badge.className}>{badge.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
