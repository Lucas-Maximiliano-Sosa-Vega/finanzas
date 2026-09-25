import "server-only";

import { requireUser } from "@/lib/auth";
import type { ISODate } from "@/lib/finance/dates";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type TransactionRow = Pick<
  Tables<"transactions">,
  "id" | "occurred_on" | "kind" | "amount" | "description" | "account_id" | "category_id"
>;

export async function listTransactions(from: ISODate, to: ISODate): Promise<TransactionRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, occurred_on, kind, amount, description, account_id, category_id")
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data.map((t) => ({ ...t, amount: Number(t.amount) }));
}
