import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Quote, QuoteItem } from "@/lib/quotes";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";
import EditQuoteForm from "./EditQuoteForm";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quote }, { data: items }, { data: clients }, { data: projects }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase.from("quote_items").select("*").eq("quote_id", id).order("sort_order"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name").order("name"),
  ]);

  if (!quote) notFound();

  return (
    <EditQuoteForm
      quote={quote as Quote}
      initialItems={(items as QuoteItem[]) ?? []}
      clients={(clients as Client[]) ?? []}
      projects={(projects as Project[]) ?? []}
    />
  );
}
