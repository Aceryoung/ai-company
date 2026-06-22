import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_BADGE } from "@/lib/projects";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: clientData }, { data: projectsData }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);

  if (!clientData) notFound();

  const client = clientData as Client;
  const projects = (projectsData as Project[]) ?? [];

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-gray-500 text-sm">←</Link>
          <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
        </div>
        <Link
          href={`/clients/${id}/edit`}
          className="text-sm text-[#26A69A] font-medium"
        >
          수정
        </Link>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          {client.contact && (
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400 w-16">담당자</span>
              <span className="text-gray-900">{client.contact}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400 w-16">연락처</span>
              <a href={`tel:${client.phone}`} className="text-[#26A69A]">{client.phone}</a>
            </div>
          )}
          {client.memo && (
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400 w-16">메모</span>
              <span className="text-gray-700 whitespace-pre-wrap">{client.memo}</span>
            </div>
          )}
          {!client.contact && !client.phone && !client.memo && (
            <p className="text-sm text-gray-400">추가 정보 없음</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">관련 프로젝트 ({projects.length})</p>
          <Link
            href={`/projects/new?client_id=${id}`}
            className="text-xs text-[#26A69A] font-medium bg-[#cdfaf6] px-2.5 py-1 rounded-lg"
          >
            + 프로젝트 추가
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400">아직 프로젝트가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                    {project.estimated_amount != null && (
                      <p className="text-xs text-gray-400">
                        예상 {project.estimated_amount.toLocaleString()}원
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_BADGE[project.status]}`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
