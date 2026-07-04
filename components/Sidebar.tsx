"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "재무",
    items: [
      {
        href: "/",
        label: "현황",
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 7.5L9 2l7 5.5V16a1 1 0 01-1 1H3a1 1 0 01-1-1V7.5z" />
            <path d="M6.5 17V10.5h5V17" />
          </svg>
        ),
      },
      {
        href: "/transactions",
        label: "거래내역",
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="7" />
            <path d="M9 6v6M6 9h6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "영업",
    items: [
      {
        href: "/clients",
        label: "고객관리",
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6.5h14M2 6.5V14a1 1 0 001 1h10a1 1 0 001-1V6.5M2 6.5V5a1 1 0 011-1h3.5l1.5-1.5H10.5L12 4H14a1 1 0 011 1v1.5" />
          </svg>
        ),
      },
      {
        href: "/quotes",
        label: "견적서",
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="2" width="12" height="14" rx="1.5" />
            <path d="M6 6h6M6 9h6M6 12h4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "도구",
    items: [
      {
        href: "/resources",
        label: "리소스",
        icon: (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 2h8a1 1 0 011 1v13l-4.5-2.5L5 16V3a1 1 0 011-1z" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[220px] bg-white border-r border-gray-100 px-3 py-4">
      <p className="text-lg font-bold text-gray-900 px-3 py-2 mb-2">ERP</p>
      <nav className="flex flex-col gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#cdfaf6] text-[#26A69A]"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
