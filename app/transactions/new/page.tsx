"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { TransactionType } from "@/lib/transactions";

function todayInKST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

type Toast = { message: string; tone: "success" | "error" };

export default function NewTransactionPage() {
  const [type, setType] = useState<TransactionType>("income");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayInKST());
  const [memo, setMemo] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, tone: Toast["tone"]) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!counterparty.trim() || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      showToast("입력값을 확인해주세요", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("transactions").insert({
      type,
      counterparty: counterparty.trim(),
      amount: parsedAmount,
      transaction_date: transactionDate,
      memo: memo.trim() || null,
      is_completed: isCompleted,
    });
    setSaving(false);

    if (error) {
      showToast("저장에 실패했어요. 다시 시도해주세요", "error");
      return;
    }

    showToast("저장됐습니다", "success");
    setType("income");
    setCounterparty("");
    setAmount("");
    setTransactionDate(todayInKST());
    setMemo("");
    setIsCompleted(false);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#f7f8fc]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">거래 입력</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-gray-600 bg-gray-100 text-xs px-3 py-1.5 rounded-full active:bg-gray-200 transition-colors"
          >
            현황
          </Link>
          <Link
            href="/transactions"
            className="text-gray-600 bg-gray-100 text-xs px-3 py-1.5 rounded-full active:bg-gray-200 transition-colors"
          >
            거래내역
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("income")}
              disabled={saving}
              className={`flex-1 text-sm font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40 ${
                type === "income" ? "bg-[#e8f7fb] text-[#00b4d8]" : "bg-gray-100 text-gray-500"
              }`}
            >
              매출 (+)
            </button>
            <button
              type="button"
              onClick={() => setType("expense")}
              disabled={saving}
              className={`flex-1 text-sm font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40 ${
                type === "expense" ? "bg-[#e8f7fb] text-[#00b4d8]" : "bg-gray-100 text-gray-500"
              }`}
            >
              매입 (-)
            </button>
          </div>

          <input
            type="text"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            disabled={saving}
            placeholder="거래처명"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#00b4d8] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />

          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={saving}
            placeholder="금액"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#00b4d8] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />

          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            disabled={saving}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#00b4d8] transition-colors disabled:opacity-40"
          />

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={saving}
            placeholder="메모 (선택)"
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#00b4d8] transition-colors placeholder:text-gray-400 disabled:opacity-40 resize-none"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              disabled={saving}
              className="w-5 h-5 rounded border-gray-300 text-[#00b4d8] focus-visible:ring-2 focus-visible:ring-[#00b4d8] disabled:opacity-40"
            />
            {type === "income" ? "입금 완료됨" : "지급 완료됨"}
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#00b4d8] text-white text-sm font-semibold px-4 py-3 rounded-xl active:bg-[#0096b8] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            저장
          </button>

          <p className="text-xs text-gray-400 text-center">저장 후 대시보드에 즉시 반영됩니다</p>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 z-50 ${
            toast.tone === "success" ? "text-[#5f9428]" : "text-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
