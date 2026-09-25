import type { Enums } from "@/types/database";

export type Bucket = Enums<"rule_bucket">;

export const BUCKETS = ["needs", "wants", "savings"] as const satisfies readonly Bucket[];

export const BUCKET_META: Record<Bucket, { label: string; hint: string }> = {
  needs: { label: "Esenciales", hint: "Alquiler, comida, servicios" },
  wants: { label: "Flexibles", hint: "Salidas, ocio, suscripciones" },
  savings: { label: "Ahorro e inversión", hint: "Lo que pagas a tu yo futuro" },
};

/** Porcentaje objetivo de los ingresos para cada bloque (suman 100). */
export type RuleTargets = Record<Bucket, number>;

export type CycleTotals = { income: number } & Record<Bucket, number>;

export const EMPTY_TOTALS: CycleTotals = { income: 0, needs: 0, wants: 0, savings: 0 };

/**
 * ok        → dentro del margen
 * warning   → superó el umbral de alerta (p. ej. 85 % del límite)
 * exceeded  → superó el límite
 * achieved  → (solo ahorro) meta del ciclo alcanzada
 */
export type AlertLevel = "ok" | "warning" | "exceeded" | "achieved";

export interface BucketStatus {
  bucket: Bucket;
  spent: number;
  limit: number;
  targetPct: number;
  /** % real sobre los ingresos del ciclo (null sin ingresos). */
  actualPct: number | null;
  /** spent / limit (1 = 100 % del límite). */
  usage: number;
  level: AlertLevel;
}

function usageOf(spent: number, limit: number): number {
  if (limit > 0) return spent / limit;
  return spent > 0 ? Number.POSITIVE_INFINITY : 0;
}

export function spendingLevel(usage: number, thresholdPct: number): AlertLevel {
  if (usage > 1) return "exceeded";
  if (usage >= thresholdPct / 100) return "warning";
  return "ok";
}

export function evaluateBucket(
  bucket: Bucket,
  totals: CycleTotals,
  targets: RuleTargets,
  thresholdPct: number,
): BucketStatus {
  const spent = totals[bucket];
  const limit = (totals.income * targets[bucket]) / 100;
  const usage = usageOf(spent, limit);

  // El ahorro es una meta mínima, no un techo: superarlo es bueno.
  const level: AlertLevel =
    bucket === "savings" ? (limit > 0 && usage >= 1 ? "achieved" : "ok") : spendingLevel(usage, thresholdPct);

  return {
    bucket,
    spent,
    limit,
    targetPct: targets[bucket],
    actualPct: totals.income > 0 ? (spent / totals.income) * 100 : null,
    usage,
    level,
  };
}

export interface RuleDeviation {
  bucket: Bucket;
  actualPct: number;
  targetPct: number;
  /** Puntos porcentuales sobre (+) o bajo (−) el objetivo. */
  deviationPts: number;
  /** Desviarse es malo si se gasta de más o se ahorra de menos. */
  isUnfavorable: boolean;
}

/** Desvío de cada bloque respecto a la regla. null si el ciclo no tuvo ingresos. */
export function ruleDeviation(totals: CycleTotals, targets: RuleTargets): RuleDeviation[] | null {
  if (totals.income <= 0) return null;

  return BUCKETS.map((bucket) => {
    const actualPct = (totals[bucket] / totals.income) * 100;
    const deviationPts = actualPct - targets[bucket];
    return {
      bucket,
      actualPct,
      targetPct: targets[bucket],
      deviationPts,
      isUnfavorable: bucket === "savings" ? deviationPts < 0 : deviationPts > 0,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Alertas por categoría y presupuesto                                        */
/* -------------------------------------------------------------------------- */

export interface CategoryInput {
  id: string;
  parent_id: string | null;
  name: string;
  bucket: Bucket | null;
  target_pct: number | null;
}

export interface BudgetInput {
  category_id: string | null;
  period_start: string | null;
  amount: number;
}

export interface SpendingAlert {
  id: string;
  label: string;
  /** Origen del límite: % de ingresos de la categoría o presupuesto fijo. */
  source: "target" | "budget";
  bucket: Bucket | null;
  spent: number;
  limit: number;
  usage: number;
  level: Extract<AlertLevel, "warning" | "exceeded">;
}

/** Gasto por categoría incluyendo, en cada padre, el de sus subcategorías. */
export function rollUpSpending(
  categories: Pick<CategoryInput, "id" | "parent_id">[],
  spending: ReadonlyMap<string, number>,
): Map<string, number> {
  const parentOf = new Map(categories.map((c) => [c.id, c.parent_id]));
  const rolledUp = new Map<string, number>();
  for (const [categoryId, spent] of spending) {
    rolledUp.set(categoryId, (rolledUp.get(categoryId) ?? 0) + spent);
    const parentId = parentOf.get(categoryId);
    if (parentId) rolledUp.set(parentId, (rolledUp.get(parentId) ?? 0) + spent);
  }
  return rolledUp;
}

/**
 * Presupuesto vigente por categoría (null = global): el específico del ciclo
 * reemplaza al recurrente.
 */
export function effectiveBudgets<T extends BudgetInput>(budgets: T[]): Map<string | null, T> {
  const result = new Map<string | null, T>();
  for (const budget of budgets) {
    const current = result.get(budget.category_id);
    if (!current || (current.period_start === null && budget.period_start !== null)) {
      result.set(budget.category_id, budget);
    }
  }
  return result;
}

interface AlertContext {
  categories: CategoryInput[];
  /** Gasto por categoría hoja en el ciclo. */
  spending: ReadonlyMap<string, number>;
  /** Presupuestos del ciclo actual y recurrentes (period_start nulo). */
  budgets: BudgetInput[];
  totals: CycleTotals;
  thresholdPct: number;
}

/**
 * Evalúa cada categoría/subcategoría con límite (target_pct o presupuesto) y
 * el presupuesto global. Las categorías padre acumulan el gasto de sus hijas.
 * Devuelve solo las que requieren atención, de mayor a menor uso.
 */
export function computeSpendingAlerts({
  categories,
  spending,
  budgets,
  totals,
  thresholdPct,
}: AlertContext): SpendingAlert[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rolledUp = rollUpSpending(categories, spending);
  const budgetByCategory = new Map([...effectiveBudgets(budgets)].map(([key, b]) => [key, b.amount]));

  const labelOf = (c: CategoryInput) => {
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };

  const candidates: Omit<SpendingAlert, "level" | "usage">[] = [];

  for (const category of categories) {
    const spent = rolledUp.get(category.id) ?? 0;
    const budget = budgetByCategory.get(category.id);

    if (category.target_pct !== null) {
      candidates.push({
        id: `target:${category.id}`,
        label: labelOf(category),
        source: "target",
        bucket: category.bucket,
        spent,
        limit: (totals.income * category.target_pct) / 100,
      });
    }
    if (budget !== undefined) {
      candidates.push({
        id: `budget:${category.id}`,
        label: labelOf(category),
        source: "budget",
        bucket: category.bucket,
        spent,
        limit: budget,
      });
    }
  }

  const globalBudget = budgetByCategory.get(null);
  if (globalBudget !== undefined) {
    candidates.push({
      id: "budget:global",
      label: "Presupuesto global",
      source: "budget",
      bucket: null,
      spent: totals.needs + totals.wants,
      limit: globalBudget,
    });
  }

  return candidates
    .map((candidate) => {
      const usage = usageOf(candidate.spent, candidate.limit);
      return { ...candidate, usage, level: spendingLevel(usage, thresholdPct) };
    })
    .filter((alert): alert is SpendingAlert => alert.level !== "ok")
    .sort((a, b) => b.usage - a.usage);
}

/* -------------------------------------------------------------------------- */
/* Proyección de ahorro                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Valor futuro de aportes mensuales constantes con interés compuesto mensual.
 * FV = P · ((1 + i)^n − 1) / i
 */
export function projectSavings(monthlyContribution: number, annualRatePct: number, months: number): number {
  const i = annualRatePct / 100 / 12;
  if (i === 0) return monthlyContribution * months;
  return monthlyContribution * ((Math.pow(1 + i, months) - 1) / i);
}
