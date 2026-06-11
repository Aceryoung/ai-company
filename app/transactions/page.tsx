import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TransactionsList from "@/components/TransactionsList";
import type { Transaction } from "@/lib/transactions";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false });

  return (
    <div className="flex flex-col min-h-dvh bg-[#f7f8fc]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">거래내역</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-gray-600 bg-gray-100 text-xs px-3 py-1.5 rounded-full active:bg-gray-200 transition-colors"
          >
            현황
          </Link>
          <Link
            href="/transactions/new"
            className="text-[#00b4d8] bg-[#e8f7fb] text-xs font-medium px-3 py-1.5 rounded-lg active:bg-[#d0eff7] transition-colors"
          >
            입력
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <TransactionsList
          initialTransactions={(data as Transaction[]) ?? []}
          initialError={!!error}
        />
      </div>
    </div>
  );
}
