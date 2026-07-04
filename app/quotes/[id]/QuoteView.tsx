"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Quote, QuoteItem, QuoteStatus } from "@/lib/quotes";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_BADGE,
  calcItemTotal,
  calcQuoteTotal,
} from "@/lib/quotes";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

type Props = { quote: Quote; items: QuoteItem[] };

const STATUS_FLOW: Partial<Record<QuoteStatus, QuoteStatus>> = {
  draft: "sent",
  sent: "accepted",
};

export default function QuoteView({ quote: initialQuote, items }: Props) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [quote, setQuote] = useState(initialQuote);
  const [advancing, setAdvancing] = useState(false);

  const subtotal = calcQuoteTotal(items);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;
  const nextStatus = STATUS_FLOW[quote.status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setAdvancing(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("quotes")
      .update({ status: nextStatus })
      .eq("id", quote.id);
    setAdvancing(false);
    if (error) { showToast("상태 변경 실패", "error"); return; }
    setQuote((p) => ({ ...p, status: nextStatus }));
    showToast(`${QUOTE_STATUS_LABELS[nextStatus]}으로 변경됐습니다`, "success");
  };

  const handleDelete = async () => {
    if (!confirm("견적서를 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("quotes").delete().eq("id", quote.id);
    router.push("/quotes");
  };

  return (
    <>
      {/* 화면 UI (인쇄 시 숨김) */}
      <div className="print:hidden flex flex-col min-h-dvh bg-[#E0F2F1]">
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Link href="/quotes" className="text-gray-500 text-sm">←</Link>
            <h1 className="text-base font-bold text-gray-900 truncate max-w-[160px]">
              {quote.recipient_name || "견적서"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium"
            >
              인쇄
            </button>
            <Link
              href={`/quotes/${quote.id}/edit`}
              className="text-xs text-[#26A69A] font-medium"
            >
              수정
            </Link>
          </div>
        </header>

        <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
          {/* 상태 + 액션 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${QUOTE_STATUS_BADGE[quote.status]}`}>
              {QUOTE_STATUS_LABELS[quote.status]}
            </span>
            <div className="flex gap-2">
              {nextStatus && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={advancing}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#26A69A] bg-[#cdfaf6] px-3 py-1.5 rounded-lg disabled:opacity-40"
                >
                  {advancing && <Spinner />}
                  {QUOTE_STATUS_LABELS[nextStatus]}으로 변경
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-400 bg-red-50 px-3 py-1.5 rounded-lg font-medium"
              >
                삭제
              </button>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-gray-600 w-24 shrink-0">수신</span>
              <span className="text-gray-900 font-medium">{quote.recipient_name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-600 w-24 shrink-0">견적번호</span>
              <span className="text-gray-700">{quote.quote_number}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-600 w-24 shrink-0">견적일자</span>
              <span className="text-gray-700">{quote.quote_date}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-600 w-24 shrink-0">유효기간</span>
              <span className="text-gray-700">견적일로부터 {quote.validity_days}일</span>
            </div>
            {quote.production_period && (
              <div className="flex gap-3">
                <span className="text-gray-600 w-24 shrink-0">제작기간</span>
                <span className="text-gray-700">{quote.production_period}</span>
              </div>
            )}
          </div>

          {/* 항목 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] text-xs text-gray-700 font-medium px-4 py-2 border-b border-gray-100">
              <span>항목명</span>
              <span className="w-16 text-right">단가</span>
              <span className="w-8 text-center">수량</span>
              <span className="w-20 text-right">합계</span>
            </div>
            {items.map((item) => {
              const t = calcItemTotal(item);
              if (item.is_section) {
                return (
                  <div key={item.id} className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                  </div>
                );
              }
              return (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-3 border-b border-gray-50 items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">{item.description}</p>
                    )}
                  </div>
                  <span className="w-16 text-right text-xs text-gray-600">
                    {item.unit_price ? item.unit_price.toLocaleString() : ""}
                  </span>
                  <span className="w-8 text-center text-xs text-gray-600">
                    {item.quantity ?? ""}
                  </span>
                  <span className="w-20 text-right text-sm font-medium text-gray-900">
                    {item.price_label
                      ? <span className="text-xs text-gray-400">{item.price_label}</span>
                      : t != null
                      ? t.toLocaleString()
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 합계 */}
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

          {quote.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">참고사항</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* 인쇄 레이아웃 (화면에선 숨김) */}
      <div className="hidden print:block print-quote">
        <style>{`
          @media print {
            @page { margin: 20mm 18mm; size: A4; }
            body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }
            .print-quote { color: #111; }
          }
        `}</style>

        {/* 헤더 */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "16px" }}>
              견적서
            </h1>
            <div style={{ fontSize: "11px", color: "#555", display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <span>수신 <strong style={{ color: "#111" }}>{quote.recipient_name}</strong></span>
              <span>견적일자 <strong style={{ color: "#111" }}>{quote.quote_date}</strong></span>
              <span>견적번호 <strong style={{ color: "#111" }}>{quote.quote_number}</strong></span>
              <span>유효기간 <strong style={{ color: "#111" }}>견적일로부터 {quote.validity_days}일</strong></span>
              {quote.production_period && (
                <span>예상제작기간 <strong style={{ color: "#111" }}>{quote.production_period}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <hr style={{ borderTop: "1px solid #e5e5e5", marginBottom: "16px" }} />

        {/* 항목 테이블 */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#777", fontWeight: 500 }}>항목명</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#777", fontWeight: 500, width: "90px" }}>단가</th>
              <th style={{ textAlign: "center", padding: "6px 8px", color: "#777", fontWeight: 500, width: "50px" }}>수량</th>
              <th style={{ textAlign: "right", padding: "6px 8px", color: "#777", fontWeight: 500, width: "100px" }}>합계</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const t = calcItemTotal(item);
              if (item.is_section) {
                return (
                  <tr key={item.id}>
                    <td
                      colSpan={4}
                      style={{ padding: "6px 8px", color: "#999", fontSize: "10px", background: "#fafafa", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}
                    >
                      {item.name}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, color: "#111", fontSize: "11.5px" }}>{item.name}</div>
                    {item.description && (
                      <div style={{ color: "#888", fontSize: "10px", marginTop: "3px", whiteSpace: "pre-line" }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", verticalAlign: "top", color: "#555" }}>
                    {item.unit_price ? item.unit_price.toLocaleString() : ""}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 8px", verticalAlign: "top", color: "#555" }}>
                    {item.quantity ?? ""}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 8px", verticalAlign: "top", fontWeight: 600 }}>
                    {item.price_label
                      ? <span style={{ color: "#999", fontWeight: 400, fontSize: "10px" }}>{item.price_label}</span>
                      : t != null
                      ? t.toLocaleString()
                      : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 하단 구분선 */}
        <hr style={{ borderTop: "1px solid #e5e5e5", marginTop: "8px", marginBottom: "16px" }} />

        {/* 합계 + 참고사항 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
          {/* 참고사항 */}
          <div style={{ flex: 1, fontSize: "10px", color: "#666" }}>
            {quote.notes && (
              <>
                <div style={{ fontWeight: 600, marginBottom: "4px", color: "#444" }}>참고사항</div>
                <div style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{quote.notes}</div>
              </>
            )}
          </div>

          {/* 합계 박스 */}
          <div style={{ minWidth: "200px", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "12px 16px", fontSize: "11px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#555" }}>
              <span>총 금액</span>
              <span>₩{subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", color: "#555" }}>
              <span>부가세(10%)</span>
              <span>₩{vat.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #e5e5e5", fontWeight: 700, fontSize: "12px" }}>
              <span>최종 견적(VAT 포함)</span>
              <span>₩{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}
