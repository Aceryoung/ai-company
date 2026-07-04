"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";
import type { Quote, QuoteItem } from "@/lib/quotes";

type ItemDraft = {
  id: string | null;
  key: string;
  name: string;
  description: string;
  unit_price: string;
  quantity: string;
  amount: string;
  price_label: string;
  is_section: boolean;
};

function toItemDraft(item: QuoteItem): ItemDraft {
  return {
    id: item.id,
    key: item.id,
    name: item.name,
    description: item.description ?? "",
    unit_price: item.unit_price ? item.unit_price.toLocaleString() : "",
    quantity: item.quantity ? String(item.quantity) : "",
    amount: item.amount ? item.amount.toLocaleString() : "",
    price_label: item.price_label ?? "",
    is_section: item.is_section,
  };
}

function newItem(overrides: Partial<ItemDraft> = {}): ItemDraft {
  return {
    id: null,
    key: Math.random().toString(36).slice(2),
    name: "",
    description: "",
    unit_price: "",
    quantity: "",
    amount: "",
    price_label: "",
    is_section: false,
    ...overrides,
  };
}

function itemTotal(item: ItemDraft): number | null {
  if (item.is_section || item.price_label) return null;
  const up = parseInt(item.unit_price.replace(/,/g, ""), 10);
  const qty = parseInt(item.quantity, 10);
  const amt = parseInt(item.amount.replace(/,/g, ""), 10);
  if (!isNaN(up) && !isNaN(qty)) return up * qty;
  if (!isNaN(amt)) return amt;
  return null;
}

function fmtNum(n: string): string {
  const raw = n.replace(/[^0-9]/g, "");
  return raw ? Number(raw).toLocaleString() : "";
}

type Props = {
  quote: Quote;
  initialItems: QuoteItem[];
  clients: Client[];
  projects: Project[];
};

export default function EditQuoteForm({ quote, initialItems, clients, projects }: Props) {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [recipientName, setRecipientName] = useState(quote.recipient_name);
  const [quoteDate, setQuoteDate] = useState(quote.quote_date);
  const [quoteNumber, setQuoteNumber] = useState(quote.quote_number);
  const [validityDays, setValidityDays] = useState(String(quote.validity_days));
  const [productionPeriod, setProductionPeriod] = useState(quote.production_period);
  const [clientId, setClientId] = useState(quote.client_id ?? "");
  const [projectId, setProjectId] = useState(quote.project_id ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [items, setItems] = useState<ItemDraft[]>(initialItems.map(toItemDraft));
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + (itemTotal(i) ?? 0), 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const moveItem = (key: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!recipientName.trim()) {
      showToast("수신자를 입력해주세요", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: quoteError } = await supabase
      .from("quotes")
      .update({
        client_id: clientId || null,
        project_id: projectId || null,
        recipient_name: recipientName.trim(),
        quote_date: quoteDate,
        quote_number: quoteNumber.trim(),
        validity_days: parseInt(validityDays, 10) || 14,
        production_period: productionPeriod.trim(),
        notes: notes.trim() || null,
      })
      .eq("id", quote.id);

    if (quoteError) {
      showToast("저장에 실패했어요", "error");
      setSaving(false);
      return;
    }

    await supabase.from("quote_items").delete().eq("quote_id", quote.id);

    const itemsToInsert = items.map((item, idx) => ({
      quote_id: quote.id,
      sort_order: idx,
      name: item.name.trim(),
      description: item.description.trim() || null,
      unit_price: item.unit_price ? parseInt(item.unit_price.replace(/,/g, ""), 10) : null,
      quantity: item.quantity ? parseInt(item.quantity, 10) : null,
      amount: item.amount ? parseInt(item.amount.replace(/,/g, ""), 10) : null,
      price_label: item.price_label.trim() || null,
      is_section: item.is_section,
    }));

    const { error: itemError } = await supabase.from("quote_items").insert(itemsToInsert);
    setSaving(false);

    if (itemError) {
      showToast("항목 저장에 실패했어요", "error");
      return;
    }

    router.push(`/quotes/${quote.id}`);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button type="button" onClick={() => router.back()} className="text-gray-500 text-sm">←</button>
        <h1 className="text-base font-bold text-gray-900">견적서 수정</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-32 md:max-w-3xl md:mx-auto md:w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">기본 정보</p>

          <div className="space-y-2">
            <label className="text-xs text-gray-700">수신자 *</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="수신자명 또는 회사명"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-gray-700">견적일자</label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-700">견적번호</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-gray-700">유효기간 (일)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-700">예상 제작기간</label>
              <input
                type="text"
                value={productionPeriod}
                onChange={(e) => setProductionPeriod(e.target.value)}
                placeholder="예: 약 3-4주"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-gray-700">고객</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] bg-white"
              >
                <option value="">선택 안함</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-700">프로젝트</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] bg-white"
              >
                <option value="">선택 안함</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">견적 항목</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setItems((p) => [...p, newItem({ is_section: true, name: "기본 제공 항목" })])}
                className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg"
              >
                + 구분선
              </button>
              <button
                type="button"
                onClick={() => setItems((p) => [...p, newItem()])}
                className="text-xs text-[#26A69A] bg-[#cdfaf6] px-2.5 py-1 rounded-lg"
              >
                + 항목 추가
              </button>
            </div>
          </div>

          {items.map((item, idx) => (
            <div key={item.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveItem(item.key, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs px-1">▲</button>
                  <button type="button" onClick={() => moveItem(item.key, 1)} disabled={idx === items.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs px-1">▼</button>
                  {item.is_section && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">구분선</span>}
                </div>
                <button type="button" onClick={() => removeItem(item.key)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
              </div>

              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.key, { name: e.target.value })}
                placeholder={item.is_section ? "구분 제목" : "항목명"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]"
              />

              {!item.is_section && (
                <>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                    placeholder="세부 설명"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] resize-none"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-700">단가</label>
                      <input type="text" value={item.unit_price} onChange={(e) => updateItem(item.key, { unit_price: fmtNum(e.target.value) })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] text-right" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-700">수량</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(item.key, { quantity: e.target.value })} placeholder="1" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] text-right" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-700">합계</label>
                      {item.unit_price && item.quantity ? (
                        <div className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-right text-gray-600">
                          {(itemTotal(item) ?? 0).toLocaleString()}
                        </div>
                      ) : (
                        <input type="text" value={item.amount} onChange={(e) => updateItem(item.key, { amount: fmtNum(e.target.value) })} placeholder="직접 입력" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] text-right" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">금액 대신 표시 (예: 별도, 미포함)</label>
                    <input type="text" value={item.price_label} onChange={(e) => updateItem(item.key, { price_label: e.target.value })} placeholder="비워두면 금액 표시" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A]" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">총 금액</span>
            <span className="font-medium">₩{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">부가세(10%)</span>
            <span className="font-medium">₩{vat.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
            <span className="font-bold text-gray-900">최종 견적(VAT 포함)</span>
            <span className="font-bold text-[#26A69A]">₩{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <label className="text-sm font-semibold text-gray-700">참고사항</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="참고사항"
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#26A69A] resize-none"
          />
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-100 md:max-w-3xl md:mx-auto">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#26A69A] text-white text-sm font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && <Spinner />}
          저장
        </button>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
