"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "현황" },
  { href: "/transactions", label: "거래내역" },
  { href: "/transactions/new", label: "입력" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[220px] bg-white border-r border-gray-100 px-3 py-4">
      <p className="text-lg font-bold text-gray-900 px-3 py-2 mb-2">ERP</p>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-[#cdfaf6] text-[#26A69A]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
