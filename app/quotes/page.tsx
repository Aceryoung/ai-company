import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/quotes";
import QuotesList from "./QuotesList";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900">견적서</h1>
      </header>
      <div className="flex-1 px-4 py-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <QuotesList quotes={(data as Quote[]) ?? []} />
      </div>
    </div>
  );
}
