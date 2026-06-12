"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import TaxFieldsInput from "@/components/TaxFieldsInput";
import type { ProofType, TransactionType } from "@/lib/transactions";

function todayInKST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export default function NewTransactionPage() {
  const [type, setType] = useState<TransactionType>("income");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [supplyValue, setSupplyValue] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [proofType, setProofType] = useState<ProofType | "">("");
  const [transactionDate, setTransactionDate] = useState(todayInKST());
  const [memo, setMemo] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { toast, showToast } = useToast();

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
      supply_value: Number(supplyValue) || 0,
      vat_amount: Number(vatAmount) || 0,
      proof_type: type === "expense" && proofType ? proofType : null,
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
    setSupplyValue("");
    setVatAmount("");
    setProofType("");
    setTransactionDate(todayInKST());
    setMemo("");
    setIsCompleted(false);
    setFormKey((key) => key + 1);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#f7f8fc]">
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">거래 입력</h1>
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

          <TaxFieldsInput
            key={formKey}
            type={type}
            supplyValue={supplyValue}
            vatAmount={vatAmount}
            proofType={proofType}
            onSupplyValueChange={setSupplyValue}
            onVatAmountChange={setVatAmount}
            onProofTypeChange={setProofType}
            disabled={saving}
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
            {saving && <Spinner />}
            저장
          </button>

          <p className="text-xs text-gray-400 text-center">저장 후 대시보드에 즉시 반영됩니다</p>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
