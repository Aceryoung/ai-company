"use client";

import { useRef, useState } from "react";

export type ToastTone = "success" | "error";
export type ToastState = { message: string; tone: ToastTone } | null;

export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, tone: ToastTone) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), durationMs);
  };

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 z-50 ${
        toast.tone === "success" ? "text-[#5f9428]" : "text-red-500"
      }`}
    >
      {toast.message}
    </div>
  );
}
