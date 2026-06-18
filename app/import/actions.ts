"use server";

import { createClient } from "@/lib/supabase/server";
import { IMPORT_DATA } from "./data";

export async function importTransactions() {
  const supabase = await createClient();

  const { error } = await supabase.from("transactions").insert(
    IMPORT_DATA.map((row) => ({
      ...row,
      type: "expense" as const,
      is_completed: true,
    }))
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
