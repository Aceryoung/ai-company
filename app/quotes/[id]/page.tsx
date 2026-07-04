import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Quote, QuoteItem } from "@/lib/quotes";
import QuoteView from "./QuoteView";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quote }, { data: items }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase.from("quote_items").select("*").eq("quote_id", id).order("sort_order"),
  ]);

  if (!quote) notFound();

  return <QuoteView quote={quote as Quote} items={(items as QuoteItem[]) ?? []} />;
}
