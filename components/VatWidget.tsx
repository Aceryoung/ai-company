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

export default function VatWidget({ transactions }: Props) {
  const years = getAvailableYears(transactions);
  const [selectedYear, setSelectedYear] = useState(years[0]);

  const idx = years.indexOf(selectedYear);
  const canPrev = idx < years.length - 1;
  const canNext = idx > 0;

  const yearly = transactions.filter((tx) =>
    tx.transaction_date.startsWith(String(selectedYear)),
  );

  const salesVat = yearly
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.vat_amount, 0);

  const purchaseVat = yearly
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.vat_amount, 0);

  const net = salesVat - purchaseVat;
  const isPay = net > 0;
  const isRefund = net < 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">부가세 현황</p>
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

      {/* 매출세액 / 매입세액 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">매출세액 (납부 원천)</span>
          <span className="text-sm font-medium text-gray-900">{salesVat.toLocaleString()}원</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">매입세액 (공제 가능)</span>
          <span className="text-sm font-medium text-[#26A69A]">− {purchaseVat.toLocaleString()}원</span>
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-gray-100" />

      {/* 결과 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {isPay ? "납부해야 할 세액" : isRefund ? "환급받을 세액" : "납부세액"}
        </span>
        <span
          className={`text-base font-bold ${
            isPay ? "text-[#e85b8a]" : isRefund ? "text-[#26A69A]" : "text-gray-400"
          }`}
        >
          {isRefund ? "+" : isPay ? "" : ""}
          {Math.abs(net).toLocaleString()}원
        </span>
      </div>

      {net === 0 && salesVat === 0 && (
        <p className="text-xs text-gray-400 text-center">{selectedYear}년 부가세 데이터가 없습니다</p>
      )}
    </div>
  );
}
