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

/**
 * Límite de crédito por cuenta (solo tarjetas de crédito que lo tengan).
 * Devuelve un mapa vacío si aún no se aplicó la migración de límites.
 */
export async function getCreditLimits(): Promise<Map<string, number>> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("id, credit_limit").not("credit_limit", "is", null);

  if (error) {
    console.error("credit_limit:", error.message);
    return new Map();
  }
  return new Map(data.map((row) => [row.id, Number(row.credit_limit)]));
}
