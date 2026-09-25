import "server-only";

import { requireUser } from "@/lib/auth";
import type { ISODate } from "@/lib/finance/dates";
import { EMPTY_TOTALS, type CycleTotals } from "@/lib/finance/rule";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type BudgetRow = Pick<Tables<"budgets">, "id" | "category_id" | "period_start" | "amount">;

/** Presupuestos que aplican al ciclo (recurrentes + específicos), gasto por categoría y totales. */
export async function getBudgetsForCycle(start: ISODate, end: ISODate) {
  await requireUser();
  const supabase = await createClient();

  const [budgets, spending, totals] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, category_id, period_start, amount")
      .or(`period_start.is.null,period_start.eq.${start}`),
    supabase.rpc("category_spending", { p_from: start, p_to: end }),
    supabase.rpc("cycle_rule_totals", { p_from: start, p_to: end }),
  ]);
  for (const result of [budgets, spending, totals]) {
    if (result.error) throw new Error(result.error.message);
  }

  const row = totals.data?.[0];
  const cycleTotals: CycleTotals = row
    ? { income: Number(row.income), needs: Number(row.needs), wants: Number(row.wants), savings: Number(row.savings) }
    : EMPTY_TOTALS;

  return {
    budgets: (budgets.data ?? []).map((b): BudgetRow => ({ ...b, amount: Number(b.amount) })),
    spending: new Map((spending.data ?? []).map((s) => [s.category_id, Number(s.spent)])),
    totals: cycleTotals,
  };
}
