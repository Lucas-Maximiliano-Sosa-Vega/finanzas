import "server-only";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Saldo actual por cuenta, o null si aún no se aplicó la migración de saldos. */
export async function getAccountBalances(): Promise<Map<string, number> | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("account_balances");

  if (error) {
    console.error("account_balances:", error.message);
    return null;
  }
  return new Map(data.map((row) => [row.account_id, Number(row.balance)]));
}
