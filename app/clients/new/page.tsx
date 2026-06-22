"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

export default function NewClientPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast("거래처명을 입력해주세요", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("로그인이 필요합니다", "error"); setSaving(false); return; }
    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      name: name.trim(),
      contact: contact.trim() || null,
      phone: phone.trim() || null,
      memo: memo.trim() || null,
    });
    setSaving(false);

    if (error) {
      showToast("저장에 실패했어요", "error");
      return;
    }

    router.push("/clients");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button type="button" onClick={() => router.back()} className="text-gray-500 text-sm">
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-900">고객 추가</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="거래처명 *"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={saving}
            placeholder="담당자명 (선택)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#26A69A] transition-colors placeholder:text-gray-400 disabled:opacity-40"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={saving}
            placeholder="연락처 (선택)"
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
