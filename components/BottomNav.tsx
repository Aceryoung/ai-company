"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "현황",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7.5L9 2l7 5.5V16a1 1 0 01-1 1H3a1 1 0 01-1-1V7.5z" />
        <path d="M6.5 17V10.5h5V17" />
      </svg>
    ),
  },
  {
    href: "/transactions",
    label: "거래",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="14" height="11" rx="1.5" />
        <path d="M2 7.5h14" />
        <path d="M6 10.5h1.5M6 13h1.5" />
      </svg>
    ),
  },
  {
    href: "/transactions/new",
    label: "입력",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7" />
        <path d="M9 6v6M6 9h6" />
      </svg>
    ),
  },
  {
    href: "/clients",
    label: "고객",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="2.5" />
        <path d="M2 15.5c0-2.761 2.239-5 5-5h0c2.761 0 5 2.239 5 5" />
        <circle cx="13" cy="6" r="2" />
        <path d="M13 11.5c1.657 0 3 1.343 3 3" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "프로젝트",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5h14M2 6.5V14a1 1 0 001 1h10a1 1 0 001-1V6.5M2 6.5V5a1 1 0 011-1h3.5l1.5-1.5H10.5L12 4H14a1 1 0 011 1v1.5" />
      </svg>
    ),
  },
  {
    href: "/resources",
    label: "리소스",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2h8a1 1 0 011 1v13l-4.5-2.5L5 16V3a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    href: "/quotes",
    label: "견적서",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="2" width="12" height="14" rx="1.5" />
        <path d="M6 6h6M6 9h6M6 12h4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 flex items-center pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors ${
              active ? "text-[#26A69A]" : "text-gray-400"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
