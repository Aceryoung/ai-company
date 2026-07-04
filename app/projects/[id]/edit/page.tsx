"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import type { Client } from "@/lib/clients";
import type { ProjectStatus, ProjectCategory } from "@/lib/projects";
import { PROJECT_STATUS_LABELS, normalizeProjectUrl } from "@/lib/projects";

const STATUSES: ProjectStatus[] = ["proposal", "active", "completed", "settled"];

export default function EditProjectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast, showToast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("personal");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("proposal");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("clients").select("id, name").order("name"),
    ]).then(([{ data: project }, { data: clientsData }]) => {
      if (!project) { router.replace("/projects"); return; }
      setName(project.name);
      setCategory((project.category as ProjectCategory) ?? "personal");
      setClientId(project.client_id ?? "");
      setStatus(project.status);
      setStartDate(project.start_date ?? "");
      setEndDate(project.end_date ?? "");
      setEstimatedAmount(project.estimated_amount?.toString() ?? "");
      setMemo(project.memo ?? "");
      setUrl(project.url ?? "");
      setClients((clientsData as Client[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast("프로젝트명을 입력해주세요", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("projects").update({
      name: name.trim(),
      category,
      client_id: clientId || null,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      estimated_amount: estimatedAmount ? Number(estimatedAmount) : null,
      memo: memo.trim() || null,
      url: normalizeProjectUrl(url),
    }).eq("id", id);
    setSaving(false);

    if (error) {
      showToast("저장에 실패했어요", "error");
      return;
    }

    router.push(`/projects/${id}`);
  };

  if (loading) {
    return <div className="min-h-dvh bg-[#E0F2F1] flex items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button type="button" onClick={() => router.back()} className="text-gray-500 text-sm">
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-900">프로젝트 수정</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(["personal", "client"] as ProjectCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                disabled={saving}
                onClick={() => setCategory(cat)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  category === cat
                    ? "bg-[#26A69A] text-white"
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                {cat === "personal" ? "개인" : "클라이언트"}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="프로젝트명 *"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />

          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={saving}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors disabled:opacity-40"
          >
            <option value="">클라이언트 없음 (개인/내부)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            disabled={saving}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors disabled:opacity-40"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
            ))}
          </select>

          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={estimatedAmount}
            onChange={(e) => setEstimatedAmount(e.target.value)}
            disabled={saving}
            placeholder="예상 계약금액 (선택)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block px-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors disabled:opacity-40"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block px-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={saving}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors disabled:opacity-40"
              />
            </div>
          </div>

          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={saving}
            placeholder="프로젝트 URL (선택)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={saving}
            placeholder="메모 (선택)"
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40 resize-none"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#26A69A] text-white text-sm font-semibold px-4 py-3 rounded-xl active:bg-[#408d86] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Spinner />}
            저장
          </button>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
