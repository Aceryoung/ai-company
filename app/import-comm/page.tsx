"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importCommTransactions } from "./actions";
import { COMM_DATA } from "./data";

export default function ImportCommPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleImport() {
    setLoading(true);
    setError(null);
    const result = await importCommTransactions();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/transactions");
    }
  }

  return (
    <div className="min-h-dvh bg-[#E0F2F1] px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">통신요금 가져오기</h1>
          <p className="text-sm text-gray-500">아래 {COMM_DATA.length}건을 매입으로 등록합니다.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">날짜</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">금액</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">공급가액</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">부가세</th>
              </tr>
            </thead>
            <tbody>
              {COMM_DATA.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-600">{row.transaction_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {row.amount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.supply_value.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.vat_amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
            오류: {error}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full bg-[#00897B] text-white font-semibold py-4 rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {loading ? "가져오는 중..." : `${COMM_DATA.length}건 일괄 가져오기`}
        </button>
      </div>
    </div>
  );
}
