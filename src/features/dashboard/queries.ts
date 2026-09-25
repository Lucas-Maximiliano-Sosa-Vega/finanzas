import "server-only";

import { getCurrentCycle, getProfile } from "@/features/settings/queries";
import { addDays, addMonths, type ISODate } from "@/lib/finance/dates";
import { previousCycleStarts, type PayCycle } from "@/lib/finance/pay-cycle";
import {
  BUCKETS,
  EMPTY_TOTALS,
  computeSpendingAlerts,
  evaluateBucket,
  ruleDeviation,
  type BucketStatus,
  type CycleTotals,
  type RuleDeviation,
  type RuleTargets,
  type SpendingAlert,
} from "@/lib/finance/rule";
import { createClient } from "@/lib/supabase/server";

/** Ciclos anteriores que se comparan en el historial de desvíos. */
const HISTORY_CYCLES = 6;

export interface HistoryEntry {
  cycleStart: ISODate;
  cycleEnd: ISODate;
  totals: CycleTotals;
  deviation: RuleDeviation[] | null;
}

export interface DashboardData {
  currency: string;
  today: ISODate;
  payday: number;
  cycle: PayCycle;
  targets: RuleTargets;
  totals: CycleTotals;
  buckets: BucketStatus[];
  alerts: SpendingAlert[];
  history: HistoryEntry[];
  /** Media de ahorro de los ciclos cerrados con ingresos (base de la proyección). */
  averageMonthlySavings: number;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [profile, { today, cycle }, supabase] = await Promise.all([getProfile(), getCurrentCycle(), createClient()]);
  const pastStarts = previousCycleStarts(cycle.start, HISTORY_CYCLES);
  const oldestStart = pastStarts.at(-1) ?? cycle.start;

  const [totalsResult, spendingResult, categoriesResult, budgetsResult] = await Promise.all([
    supabase.rpc("cycle_rule_totals", { p_from: oldestStart, p_to: cycle.end }),
    supabase.rpc("category_spending", { p_from: cycle.start, p_to: cycle.end }),
    supabase.from("categories").select("id, parent_id, name, bucket, target_pct").eq("kind", "expense"),
    supabase
      .from("budgets")
      .select("category_id, period_start, amount")
      .or(`period_start.is.null,period_start.eq.${cycle.start}`),
  ]);

  for (const result of [totalsResult, spendingResult, categoriesResult, budgetsResult]) {
    if (result.error) throw new Error(`Error al cargar el dashboard: ${result.error.message}`);
  }

  // PostgREST puede devolver `numeric` como string: se normaliza a number.
  const totalsByCycle = new Map<ISODate, CycleTotals>(
    (totalsResult.data ?? []).map((row) => [
      row.cycle_start,
      {
        income: Number(row.income),
        needs: Number(row.needs),
        wants: Number(row.wants),
        savings: Number(row.savings),
      },
    ]),
  );

  const targets: RuleTargets = {
    needs: profile.needs_pct,
    wants: profile.wants_pct,
    savings: profile.savings_pct,
  };
  const threshold = profile.alert_threshold_pct;
  const totals = totalsByCycle.get(cycle.start) ?? EMPTY_TOTALS;

  const history: HistoryEntry[] = pastStarts.map((start) => {
    const cycleTotals = totalsByCycle.get(start) ?? EMPTY_TOTALS;
    return {
      cycleStart: start,
      cycleEnd: addDays(addMonths(start, 1), -1),
      totals: cycleTotals,
      deviation: ruleDeviation(cycleTotals, targets),
    };
  });

  const cyclesWithIncome = history.filter((entry) => entry.totals.income > 0);
  const averageMonthlySavings =
    cyclesWithIncome.length > 0
      ? cyclesWithIncome.reduce((sum, entry) => sum + entry.totals.savings, 0) / cyclesWithIncome.length
      : totals.savings;

  return {
    currency: profile.currency,
    today,
    payday: profile.payday,
    cycle,
    targets,
    totals,
    buckets: BUCKETS.map((bucket) => evaluateBucket(bucket, totals, targets, threshold)),
    alerts: computeSpendingAlerts({
      categories: (categoriesResult.data ?? []).map((c) => ({
        ...c,
        target_pct: c.target_pct === null ? null : Number(c.target_pct),
      })),
      spending: new Map((spendingResult.data ?? []).map((row) => [row.category_id, Number(row.spent)])),
      budgets: (budgetsResult.data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })),
      totals,
      thresholdPct: threshold,
    }),
    history,
    averageMonthlySavings,
  };
}

