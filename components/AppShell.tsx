"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DesktopTopBar from "@/components/DesktopTopBar";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex flex-col flex-1 lg:ml-[220px]">
        <DesktopTopBar />
        {children}
      </div>
      <BottomNav />
    </>
  );
}
