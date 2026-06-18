"use server";

import { createClient } from "@/lib/supabase/server";
import { HEALTH_DATA } from "./data";

export async function importHealthTransactions() {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert(
    HEALTH_DATA.map((row) => ({ ...row, type: "expense" as const, is_completed: true }))
  );
  if (error) return { error: error.message };
  return { success: true };
}
