import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-dvh bg-[#f7f8fc]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">현황</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/transactions"
            className="text-[#00b4d8] bg-[#e8f7fb] text-xs font-medium px-3 py-1.5 rounded-lg active:bg-[#d0eff7] transition-colors"
          >
            거래내역
          </Link>
          <LogoutButton />
        </div>
      </header>
      <div className="flex-1 px-4 py-4 space-y-4 pb-24 md:max-w-3xl md:mx-auto md:w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-700">
            로그인 성공: {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
