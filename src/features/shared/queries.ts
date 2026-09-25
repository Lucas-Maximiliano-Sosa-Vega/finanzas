import "server-only";

import { cache } from "react";

import type { Category } from "@/features/categories/tree";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Account = Pick<Tables<"accounts">, "id" | "name" | "type" | "initial_balance" | "is_archived">;

/** Cuentas y categorías del usuario (memoizado por petición). */
export const getCatalog = cache(async () => {
  await requireUser();
  const supabase = await createClient();

  const [accounts, categories] = await Promise.all([
    supabase.from("accounts").select("id, name, type, initial_balance, is_archived").order("created_at"),
    supabase.from("categories").select("id, parent_id, name, kind, bucket, target_pct"),
  ]);
  if (accounts.error) throw new Error(accounts.error.message);
  if (categories.error) throw new Error(categories.error.message);

  return {
    accounts: accounts.data.map((a): Account => ({ ...a, initial_balance: Number(a.initial_balance) })),
    categories: categories.data.map(
      (c): Category => ({ ...c, target_pct: c.target_pct === null ? null : Number(c.target_pct) }),
    ),
  };
});
