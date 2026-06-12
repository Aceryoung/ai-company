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
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">거래내역</h1>
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
