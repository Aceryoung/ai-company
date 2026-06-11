"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-gray-600 bg-gray-100 text-xs px-3 py-1.5 rounded-full
                 active:bg-gray-200 disabled:opacity-40 transition-colors"
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
