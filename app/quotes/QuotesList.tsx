"use client";

import Link from "next/link";
import type { Quote } from "@/lib/quotes";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_BADGE } from "@/lib/quotes";

type Props = { quotes: Quote[] };

export default function QuotesList({ quotes }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/quotes/new"
          className="text-xs font-medium text-[#26A69A] bg-[#cdfaf6] px-3 py-1.5 rounded-full"
        >
          + 견적서 작성
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
          <p className="text-sm text-gray-400">작성된 견적서가 없습니다</p>
          <Link
            href="/quotes/new"
            className="inline-block text-[#26A69A] bg-[#cdfaf6] text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            견적서 작성하기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {q.recipient_name || "(수신자 없음)"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {q.quote_number} · {q.quote_date}
                  </p>
                </div>
                <span
                  className={`shrink-0 ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${QUOTE_STATUS_BADGE[q.status]}`}
                >
                  {QUOTE_STATUS_LABELS[q.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
