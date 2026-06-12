"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import { Toast, useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { getBadge, type Transaction } from "@/lib/transactions";

type ListState = "loading" | "empty" | "error" | "success";

type Props = {
  initialTransactions: Transaction[];
  initialError: boolean;
};

export default function TransactionsList({ initialTransactions, initialError }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [state, setState] = useState<ListState>(
    initialError ? "error" : initialTransactions.length > 0 ? "success" : "empty",
  );
  const [selected, setSelected] = useState<Transaction | null>(null);
  const { toast, showToast } = useToast(2000);

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
    setState((data ?? []).length > 0 ? "success" : "empty");
  }, []);

  const handleRetry = () => {
    setState("loading");
    fetchTransactions();
  };

  return (
    <>
      {state === "loading" && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <Skeleton />
            </div>
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center space-y-3">
          <p className="text-sm text-gray-700">목록을 불러오지 못했습니다</p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-[#26A69A] bg-[#cdfaf6] text-xs font-medium px-3 py-1.5 rounded-lg active:bg-[#D0EBEA] transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {state === "empty" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500">아직 거래가 없습니다</p>
        </div>
      )}

      {state === "success" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const badge = getBadge(tx);
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelected(tx)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer active:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {tx.counterparty}
                    </span>
                    <span className="text-xs text-gray-400">{tx.transaction_date}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {tx.amount.toLocaleString()}원
                    </span>
                    <span className={badge.className}>{badge.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <TransactionDetailModal
          transaction={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            showToast("변경됐습니다", "success");
            fetchTransactions();
          }}
          onError={(message) => showToast(message, "error")}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
