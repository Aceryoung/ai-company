import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/projects";
import type { Client } from "@/lib/clients";
import type { Transaction } from "@/lib/transactions";
import ProjectDetail from "./ProjectDetail";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: projectData }, { data: txData }] = await Promise.all([
    supabase.from("projects").select("*, clients(id, name, contact)").eq("id", id).single(),
    supabase
      .from("transactions")
      .select("*")
      .eq("project_id", id)
      .order("transaction_date", { ascending: false }),
  ]);

  if (!projectData) notFound();

  const { clients: clientData, ...projectFields } = projectData as Project & { clients: Client | null };

  return (
    <ProjectDetail
      project={projectFields}
      client={clientData}
      transactions={(txData as Transaction[]) ?? []}
    />
  );
}
