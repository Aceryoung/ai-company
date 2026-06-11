"use server";

import { createClient } from "@/lib/supabase/server";

export async function loginWithPin(pin: string): Promise<{ error?: string }> {
  if (pin !== process.env.APP_PIN) {
    return { error: "PIN이 올바르지 않습니다" };
  }

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
