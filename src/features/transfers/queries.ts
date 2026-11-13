import "server-only";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type TransferRow = Pick<
  Tables<"transfers">,
  "id" | "from_account_id" | "to_account_id" | "amount" | "occurred_on" | "description"
>;

/** Últimas transferencias; vacío si aún no se aplicó la migración. */
export async function getRecentTransfers(limit = 10): Promise<TransferRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transfers")
    .select("id, from_account_id, to_account_id, amount, occurred_on, description")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("transfers:", error.message);
    return [];
  }
  return data.map((t) => ({ ...t, amount: Number(t.amount) }));
}
