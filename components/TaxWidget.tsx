"use client";

import { useState } from "react";
import type { Transaction } from "@/lib/transactions";

type Props = {
  transactions: Transaction[];
};

function getAvailableYears(transactions: Transaction[]): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>(transactions.map((tx) => Number(tx.transaction_date.slice(0, 4))));
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
}

function calculateTax(revenue: number, expenses: number) {
  const netIncome = revenue - expenses;
  if (netIncome <= 0) {
    return {
      netIncome,
      taxBase: 0,
      taxBeforeReduction: 0,
      finalTax: 0,
      comment: "결손(적자)이므로 낼 세금이 없습니다.",
    };
  }

  const deduction = 1500000;
  const taxBase = Math.max(0, netIncome - deduction);

  let taxBeforeReduction = 0;
  if (taxBase <= 14000000) {
    taxBeforeReduction = taxBase * 0.06;
  } else if (taxBase <= 50000000) {
    taxBeforeReduction = taxBase * 0.15 - 1260000;
  } else if (taxBase <= 88000000) {
    taxBeforeReduction = taxBase * 0.24 - 5760000;
  } else if (taxBase <= 150000000) {
    taxBeforeReduction = taxBase * 0.35 - 15440000;
  } else if (taxBase <= 300000000) {
    taxBeforeReduction = taxBase * 0.38 - 19940000;
  } else if (taxBase <= 500000000) {
    taxBeforeReduction = taxBase * 0.4 - 25940000;
  } else {
    taxBeforeReduction = taxBase * 0.42 - 35940000;
  }

  const taxReduction = taxBeforeReduction * 1.0; // 청년창업 100% 감면
  const finalTax = taxBeforeReduction - taxReduction;

  return {
    netIncome,
    taxBase,
    taxBeforeReduction,
    finalTax,
    comment: "청년창업 세액감면 100% 적용 — 최종 납부세액 0원 (5월 전산 신고 필수)",
  };
}

export default function TaxWidget({ transactions }: Props) {
  const years = getAvailableYears(transactions);
  const [selectedYear, setSelectedYear] = useState(years[0]);

  const idx = years.indexOf(selectedYear);
  const canPrev = idx < years.length - 1;
  const canNext = idx > 0;

  const yearly = transactions.filter((tx) =>
    tx.transaction_date.startsWith(String(selectedYear)),
  );

  const revenue = yearly
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenses = yearly
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const { netIncome, taxBase, taxBeforeReduction, finalTax, comment } = calculateTax(
    revenue,
    expenses,
  );

  const isDeficit = netIncome <= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">종합소득세 예상</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedYear(years[idx + 1])}
            disabled={!canPrev}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 disabled:opacity-30 active:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 w-12 text-center">{selectedYear}</span>
          <button
            type="button"
            onClick={() => setSelectedYear(years[idx - 1])}
            disabled={!canNext}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 disabled:opacity-30 active:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 매출 / 매입 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">매출</span>
          <span className="text-sm font-medium text-gray-900">{revenue.toLocaleString()}원</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">매입·경비</span>
          <span className="text-sm font-medium text-gray-900">− {expenses.toLocaleString()}원</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">사업소득 (순이익)</span>
          <span className={`text-sm font-medium ${isDeficit ? "text-[#e85b8a]" : "text-gray-900"}`}>
            {netIncome.toLocaleString()}원
          </span>
        </div>
      </div>

      {!isDeficit && (
        <>
          <div className="border-t border-gray-100" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">인적공제 후 과세표준</span>
              <span className="text-sm font-medium text-gray-900">{taxBase.toLocaleString()}원</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">감면 전 세액</span>
              <span className="text-sm font-medium text-gray-900">{taxBeforeReduction.toLocaleString()}원</span>
            </div>
          </div>
        </>
      )}

      <div className="border-t border-gray-100" />

      {/* 최종 납부세액 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">최종 납부세액</span>
        <span className="text-base font-bold text-[#26A69A]">
          {finalTax.toLocaleString()}원
        </span>
      </div>

      <p className="text-[11px] text-gray-400 leading-snug">{comment}</p>
    </div>
  );
}
