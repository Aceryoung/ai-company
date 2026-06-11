"use client";

import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const TITLES: Record<string, string> = {
  "/": "현황",
  "/transactions": "거래내역",
  "/transactions/new": "거래 입력",
};

export default function DesktopTopBar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "";

  return (
    <header className="hidden lg:flex items-center justify-between h-14 px-5 bg-white border-b border-gray-100 sticky top-0 z-20">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <LogoutButton />
    </header>
  );
}
