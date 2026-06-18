"use server";

import { createClient } from "@/lib/supabase/server";
import { COMM_DATA } from "./data";

export async function importCommTransactions() {
  const supabase = await createClient();

  const { error } = await supabase.from("transactions").insert(
    COMM_DATA.map((row) => ({
      ...row,
      type: "expense" as const,
      is_completed: true,
    }))
  );

  if (error) return { error: error.message };
  return { success: true };
}
