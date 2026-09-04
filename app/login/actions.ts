"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

// 인메모리 rate limit: IP별 실패 횟수 추적
// (단일 서버 프로세스 기준 — 다중 인스턴스면 Redis 필요)
const FAIL_LIMIT = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15분

const failMap = new Map<string, { count: number; lockedUntil: number }>();

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export async function loginWithPin(pin: string): Promise<{ error?: string }> {
  const ip = await getClientIp();
  const now = Date.now();
  const entry = failMap.get(ip);

  if (entry && entry.lockedUntil > now) {
    const remaining = Math.ceil((entry.lockedUntil - now) / 60000);
    return { error: `너무 많이 시도했습니다. ${remaining}분 후 다시 시도해주세요.` };
  }

  if (pin !== process.env.APP_PIN) {
    const fails = (entry?.count ?? 0) + 1;
    failMap.set(ip, {
      count: fails,
      lockedUntil: fails >= FAIL_LIMIT ? now + LOCKOUT_MS : 0,
    });
    const remaining = FAIL_LIMIT - fails;
    return {
      error: remaining > 0
        ? `PIN이 올바르지 않습니다 (${remaining}회 남음)`
        : "5회 실패로 15분간 잠겼습니다.",
    };
  }

  // 성공 시 실패 기록 초기화
  failMap.delete(ip);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.AUTH_EMAIL!,
    password: process.env.AUTH_PASSWORD!,
  });

  if (error) {
    return { error: "로그인에 실패했습니다" };
  }

  return {};
}
