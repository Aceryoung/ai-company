"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";
import TaxFieldsInput from "@/components/TaxFieldsInput";
import { getBadge, type ProofType, type Transaction } from "@/lib/transactions";

type Props = {
  transaction: Transaction;
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
};

type ActionLoading = "save" | "delete" | "toggle" | null;

export default function TransactionDetailModal({
  transaction,
  onClose,
  onChanged,
  onError,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);

  const [type, setType] = useState(transaction.type);
  const [counterparty, setCounterparty] = useState(transaction.counterparty);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [supplyValue, setSupplyValue] = useState(String(transaction.supply_value));
  const [vatAmount, setVatAmount] = useState(String(transaction.vat_amount));
  const [proofType, setProofType] = useState<ProofType | "">(transaction.proof_type ?? "");
  const [transactionDate, setTransactionDate] = useState(transaction.transaction_date);
  const [memo, setMemo] = useState(transaction.memo ?? "");

  const badge = getBadge(transaction);
  const disabled = actionLoading !== null;

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!counterparty.trim() || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      onError("입력값을 확인해주세요");
      return;
    }

    setActionLoading("save");
    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .update({
        type,
        counterparty: counterparty.trim(),
        amount: parsedAmount,
        supply_value: Number(supplyValue) || 0,
        vat_amount: Number(vatAmount) || 0,
        proof_type: proofType || null,
        transaction_date: transactionDate,
        memo: memo.trim() || null,
      })
      .eq("id", transaction.id);

    setActionLoading(null);

    if (error) {
      onError("처리에 실패했어요. 다시 시도해주세요");
      return;
    }

    onChanged();
  };

  const handleToggleStatus = async () => {
    setActionLoading("toggle");
    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .update({ is_completed: !transaction.is_completed })
      .eq("id", transaction.id);

    setActionLoading(null);

    if (error) {
      onError("처리에 실패했어요. 다시 시도해주세요");
      return;
    }

    onChanged();
  };

  const handleDelete = async () => {
    setActionLoading("delete");
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);

    setActionLoading(null);

    if (error) {
      onError("처리에 실패했어요. 다시 시도해주세요");
      return;
    }

    onChanged();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4 shadow-xl space-y-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">{transaction.counterparty}</p>
                <p className="text-xs text-gray-400">{transaction.transaction_date}</p>
              </div>
              <span className={badge.className}>{badge.label}</span>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">구분</span>
                <span>{transaction.type === "income" ? "매출" : "매입"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">금액</span>
                <span className="font-semibold text-gray-900">
                  {transaction.amount.toLocaleString()}원
                </span>
              </div>
              {(transaction.supply_value > 0 || transaction.vat_amount > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">공급가액 / 부가세</span>
                  <span>
                    {transaction.supply_value.toLocaleString()}원 / {transaction.vat_amount.toLocaleString()}원
                  </span>
                </div>
              )}
              {transaction.proof_type && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">증빙유형</span>
                  <span>{transaction.proof_type}</span>
                </div>
              )}
              {transaction.memo && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500 shrink-0">메모</span>
                  <span className="text-right">{transaction.memo}</span>
                </div>
              )}
            </div>

            {confirmingDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 text-center">정말 삭제할까요?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={disabled}
                    className="flex-1 text-gray-600 bg-gray-100 text-sm font-medium px-4 py-3 rounded-xl active:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={disabled}
                    className="flex-1 bg-red-500 text-white text-sm font-semibold px-4 py-3 rounded-xl active:bg-red-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === "delete" && <Spinner />}
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={disabled}
                  className="w-full bg-[#26A69A] text-white text-sm font-semibold px-4 py-3 rounded-xl active:bg-[#408d86] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading === "toggle" && <Spinner />}
                  {transaction.is_completed ? "미완료로 변경" : "완료로 변경"}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={disabled}
                    className="flex-1 text-[#26A69A] bg-[#cdfaf6] text-sm font-medium px-4 py-3 rounded-xl active:bg-[#D0EBEA] disabled:opacity-40 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={disabled}
                    className="flex-1 text-gray-600 bg-gray-100 text-sm font-medium px-4 py-3 rounded-xl active:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    삭제
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={disabled}
                  className="w-full text-gray-500 text-sm font-medium px-4 py-2 disabled:opacity-40 transition-colors"
                >
                  닫기
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-900">거래 수정</p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("income")}
                  disabled={disabled}
                  className={`flex-1 text-sm font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40 ${
                    type === "income"
                      ? "bg-[#cdfaf6] text-[#26A69A]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  매출
                </button>
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  disabled={disabled}
                  className={`flex-1 text-sm font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40 ${
                    type === "expense"
                      ? "bg-[#cdfaf6] text-[#26A69A]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  매입
                </button>
              </div>

              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                disabled={disabled}
                placeholder="거래처명"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
              />

              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={disabled}
                placeholder="금액"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
              />

              <TaxFieldsInput
                supplyValue={supplyValue}
                vatAmount={vatAmount}
                proofType={proofType}
                onSupplyValueChange={setSupplyValue}
                onVatAmountChange={setVatAmount}
                onProofTypeChange={setProofType}
                disabled={disabled}
              />

              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                disabled={disabled}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors disabled:opacity-40"
              />

              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={disabled}
                placeholder="메모 (선택)"
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={disabled}
                className="flex-1 text-gray-600 bg-gray-100 text-sm font-medium px-4 py-3 rounded-xl active:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={disabled}
                className="flex-1 bg-[#26A69A] text-white text-sm font-semibold px-4 py-3 rounded-xl active:bg-[#408d86] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading === "save" && <Spinner />}
                저장
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
