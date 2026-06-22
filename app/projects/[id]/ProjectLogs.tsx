"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";
import { Toast, useToast } from "@/components/Toast";

type Log = {
  id: string;
  log_date: string;
  content: string;
  created_at: string;
};

export default function ProjectLogs({ projectId }: { projectId: string }) {
  const { toast, showToast } = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [writeOpen, setWriteOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [logDate, setLogDate] = useState(today);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("project_logs")
      .select("id, log_date, content, created_at")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false })
      .then(({ data }) => {
        setLogs((data as Log[]) ?? []);
        setLoading(false);
      });
  }, [projectId]);

  const handleOpenWrite = () => {
    setLogDate(today);
    setContent("");
    setWriteOpen(true);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("로그인이 필요합니다", "error"); setSaving(false); return; }

    const { data, error } = await supabase
      .from("project_logs")
      .insert({ user_id: user.id, project_id: projectId, log_date: logDate, content: content.trim() })
      .select("id, log_date, content, created_at")
      .single();
    setSaving(false);

    if (error) { showToast("저장에 실패했어요", "error"); return; }

    setLogs((prev) => {
      const next = [data as Log, ...prev];
      return next.sort((a, b) => b.log_date.localeCompare(a.log_date));
    });
    setWriteOpen(false);
    showToast("일지가 저장됐습니다", "success");
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("project_logs").delete().eq("id", id);
    if (error) { showToast("삭제에 실패했어요", "error"); return; }
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (expanded === id) setExpanded(null);
    showToast("삭제됐습니다", "success");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">개발일지 ({logs.length})</p>
        <button
          type="button"
          onClick={handleOpenWrite}
          className="text-xs text-[#26A69A] font-medium bg-[#cdfaf6] px-2.5 py-1 rounded-lg"
        >
          + 작성
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex justify-center">
          <Spinner />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-400">아직 작성된 일지가 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const isOpen = expanded === log.id;
              return (
                <div key={log.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#26A69A] bg-[#cdfaf6] px-2 py-0.5 rounded-md shrink-0">
                        {log.log_date}
                      </span>
                      {!isOpen && (
                        <span className="text-sm text-gray-600 truncate max-w-[180px]">
                          {log.content.split("\n")[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-300 text-xs ml-2">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 space-y-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {log.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDelete(log.id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 일지 작성 모달 */}
      {writeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setWriteOpen(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">개발일지 작성</p>
              <button type="button" onClick={() => setWriteOpen(false)} className="text-gray-400 text-lg leading-none">×</button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">날짜</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘 작업한 내용을 기록해주세요"
                  rows={6}
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="px-4 pb-6 pt-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={!content.trim() || saving}
                className="w-full bg-[#26A69A] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <Spinner />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
