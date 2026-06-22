"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Resource, ResourceCategory } from "@/lib/resources";
import {
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_CATEGORY_BADGE,
  RESOURCE_CATEGORIES,
} from "@/lib/resources";
import { Spinner } from "@/components/Spinner";
import { Toast, useToast } from "@/components/Toast";

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const ALL = "all" as const;
type Filter = ResourceCategory | typeof ALL;

export default function ResourcesList() {
  const { toast, showToast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(ALL);
  const [addOpen, setAddOpen] = useState(false);

  // add form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("dev");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setResources((data as Resource[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = filter === ALL ? resources : resources.filter((r) => r.category === filter);

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) {
      showToast("제목과 URL을 입력해주세요", "error");
      return;
    }

    const fullUrl = url.startsWith("http") ? url.trim() : `https://${url.trim()}`;

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showToast("로그인이 필요합니다", "error");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("resources")
      .insert({ user_id: user.id, title: title.trim(), url: fullUrl, category, memo: memo.trim() || null })
      .select()
      .single();

    setSaving(false);
    if (error) {
      showToast("저장에 실패했어요", "error");
      return;
    }

    setResources((prev) => [data as Resource, ...prev]);
    setTitle("");
    setUrl("");
    setCategory("dev");
    setMemo("");
    setAddOpen(false);
    showToast("저장됐습니다", "success");
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) { showToast("삭제에 실패했어요", "error"); return; }
    setResources((prev) => prev.filter((r) => r.id !== id));
    showToast("삭제됐습니다", "success");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900">리소스</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="text-sm font-semibold text-white bg-[#26A69A] px-3 py-1.5 rounded-lg"
        >
          + 추가
        </button>
      </header>

      {/* 카테고리 필터 */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {([ALL, ...RESOURCE_CATEGORIES] as Filter[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-[#26A69A] text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {cat === ALL ? "전체" : RESOURCE_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-2 md:max-w-3xl md:mx-auto md:w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-400">저장된 링크가 없습니다</p>
            <p className="text-xs text-gray-300 mt-1">+ 추가 버튼으로 링크를 저장하세요</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${getDomain(r.url)}&sz=32`}
                      alt=""
                      width={18}
                      height={18}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-gray-900 hover:text-[#26A69A] transition-colors block truncate"
                    >
                      {r.title}
                    </a>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${RESOURCE_CATEGORY_BADGE[r.category]}`}>
                        {RESOURCE_CATEGORY_LABELS[r.category]}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">{getDomain(r.url)}</span>
                    </div>
                    {r.memo && <p className="text-xs text-gray-500 mt-1">{r.memo}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0 mt-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={() => setAddOpen(false)}>
          <div
            className="mt-auto bg-white rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">링크 추가</p>
              <button type="button" onClick={() => setAddOpen(false)} className="text-gray-400 text-lg leading-none">×</button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* 카테고리 */}
              <div className="flex gap-2 flex-wrap">
                {RESOURCE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      category === cat ? "bg-[#26A69A] text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {RESOURCE_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목 *"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400"
              />

              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL * (https://...)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400"
              />

              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모 (선택)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400"
              />

              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="w-full bg-[#26A69A] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <Spinner />}
                저장
              </button>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
