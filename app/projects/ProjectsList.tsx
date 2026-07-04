"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/projects";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_BADGE, PROJECT_CATEGORY_LABELS, PROJECT_CATEGORY_BADGE } from "@/lib/projects";

type Tab = "all" | ProjectStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "proposal", label: "상담중" },
  { key: "active", label: "진행중" },
  { key: "completed", label: "완료" },
  { key: "settled", label: "정산완료" },
];

type Props = {
  projects: Project[];
  clientMap: Record<string, string>;
};

export default function ProjectsList({ projects, clientMap }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = tab === "all" ? projects : projects.filter((p) => p.status === tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              tab === t.key
                ? "bg-[#26A69A] text-white"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href="/projects/new"
          className="shrink-0 ml-auto text-xs font-medium text-[#26A69A] bg-[#cdfaf6] px-3 py-1.5 rounded-full"
        >
          + 추가
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
          <p className="text-sm text-gray-400">해당 프로젝트가 없습니다</p>
          <Link
            href="/projects/new"
            className="inline-block text-[#26A69A] bg-[#cdfaf6] text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            프로젝트 추가하기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((project) => (
              <div key={project.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${PROJECT_CATEGORY_BADGE[project.category ?? "personal"]}`}
                    >
                      {PROJECT_CATEGORY_LABELS[project.category ?? "personal"]}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {project.client_id ? clientMap[project.client_id] : "클라이언트 없음"}
                    {project.estimated_amount != null &&
                      ` · ${project.estimated_amount.toLocaleString()}원`}
                  </p>
                </Link>
                <div className="shrink-0 ml-3 flex items-center gap-2">
                  {(project.url || project.github_repo) && (
                    <a
                      href={project.url ?? `https://github.com/${project.github_repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#26A69A] text-xs font-medium bg-[#cdfaf6] px-2 py-0.5 rounded-full"
                    >
                      열기 ↗
                    </a>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_BADGE[project.status]}`}
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
