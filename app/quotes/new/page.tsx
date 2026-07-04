import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: projects }, { data: existingQuotes }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("quotes").select("quote_number"),
  ]);

  const existingNumbers = (existingQuotes ?? []).map((q: { quote_number: string }) => q.quote_number);

  return (
    <NewQuoteForm
      clients={(clients as Client[]) ?? []}
      projects={(projects as Project[]) ?? []}
      existingNumbers={existingNumbers}
    />
  );
}
