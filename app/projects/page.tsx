import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/projects";
import type { Client } from "@/lib/clients";
import ProjectsList from "./ProjectsList";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: projectsData }, { data: clientsData }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name"),
  ]);

  const projects = (projectsData as Project[]) ?? [];
  const clients = (clientsData as Pick<Client, "id" | "name">[]) ?? [];

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
      </header>

      <div className="flex-1 px-4 py-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="hidden lg:flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
        </div>
        <ProjectsList projects={projects} clientMap={clientMap} />
      </div>
    </div>
  );
}
