import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/clients";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (clients as Client[]) ?? [];

  return (
    <div className="flex flex-col min-h-dvh bg-[#E0F2F1]">
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">고객관리</h1>
        <Link
          href="/clients/new"
          className="text-sm font-medium text-[#26A69A] bg-[#cdfaf6] px-3 py-1.5 rounded-lg"
        >
          + 추가
        </Link>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="hidden lg:flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">고객관리</h1>
          <Link
            href="/clients/new"
            className="text-sm font-medium text-[#26A69A] bg-[#cdfaf6] px-3 py-1.5 rounded-lg hover:bg-[#b2f5ef] transition-colors"
          >
            + 추가
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
            <p className="text-sm text-gray-500">아직 고객이 없습니다</p>
            <Link
              href="/clients/new"
              className="inline-block text-[#26A69A] bg-[#cdfaf6] text-xs font-medium px-3 py-1.5 rounded-lg"
            >
              첫 고객 추가하기
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {rows.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                    {client.contact && (
                      <p className="text-xs text-gray-400">{client.contact}</p>
                    )}
                  </div>
                  <span className="text-gray-300 text-sm">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
