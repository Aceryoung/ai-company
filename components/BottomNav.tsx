"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "현황" },
  { href: "/transactions", label: "거래내역" },
  { href: "/transactions/new", label: "입력" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 flex items-center pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex items-center justify-center h-14 text-sm font-medium transition-colors ${
              active ? "text-[#26A69A]" : "text-gray-400"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
