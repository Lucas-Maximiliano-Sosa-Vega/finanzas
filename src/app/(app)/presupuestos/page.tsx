import { PencilIcon, PlusIcon, TargetIcon } from "lucide-react";
import type { Metadata } from "next";

import { CycleNav, resolveCycle } from "@/components/cycle-nav";
import { Meter } from "@/components/meter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BudgetFormDialog } from "@/features/budgets/components/budget-form";
import { getBudgetsForCycle } from "@/features/budgets/queries";
import { categoryLabel } from "@/features/categories/tree";
import { StatusLabel, statusFill } from "@/features/dashboard/components/status-label";
import { getCurrentCycle, getProfile } from "@/features/settings/queries";
import { getCatalog } from "@/features/shared/queries";
import { effectiveBudgets, rollUpSpending, spendingLevel } from "@/lib/finance/rule";
import { formatCurrency, formatRange } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function BudgetsPage({ searchParams }: PageProps<"/presupuestos">) {
  const [{ ciclo }, profile, { cycle: current }, { categories }] = await Promise.all([
    searchParams,
    getProfile(),
    getCurrentCycle(),
    getCatalog(),
  ]);
  const { start, end } = resolveCycle(ciclo, profile.payday, current.start);
  const { budgets, spending, totals } = await getBudgetsForCycle(start, end);

  const { currency } = profile;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const spent = rollUpSpending(categories, spending);

  const rows = [...effectiveBudgets(budgets).values()]
    .map((budget) => {
      const category = budget.category_id ? byId.get(budget.category_id) : undefined;
      const used = budget.category_id === null ? totals.needs + totals.wants : (spent.get(budget.category_id) ?? 0);
      const usage = used / budget.amount;
      const level = spendingLevel(usage, profile.alert_threshold_pct);
      return {
        budget,
        used,
        usage,
        status: level === "achieved" ? ("ok" as const) : level,
        label:
          budget.category_id === null ? "Todos mis gastos" : category ? categoryLabel(category, byId) : "Categoría eliminada",
        bucket: category?.bucket ?? null,
      };
    })
    // Global primero, luego los más gastados.
    .sort((a, b) => Number(b.budget.category_id === null) - Number(a.budget.category_id === null) || b.usage - a.usage);

  const formProps = { categories, cycleStart: start, cycleLabel: formatRange(start, end) };

  return (
    <div className="space-y-10">
      <PageHeader title="Presupuestos" description="Pon un máximo a lo que gastas y te avisaremos si te acercas.">
        <BudgetFormDialog
          {...formProps}
          trigger={
            <Button size="lg" className="h-12 px-5 text-base">
              <PlusIcon className="size-5" />
              Nuevo presupuesto
            </Button>
          }
        />
      </PageHeader>

      <CycleNav basePath="/presupuestos" start={start} end={end} currentStart={current.start} />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <TargetIcon className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-medium">Todavía no tienes presupuestos</p>
          <p className="max-w-sm text-base text-muted-foreground">
            Por ejemplo: «Salidas, máximo 300.000 al mes». Usa el botón azul de arriba para crear uno.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map(({ budget, used, usage, status, label, bucket }) => {
            const remaining = budget.amount - used;
            return (
              <li key={budget.id}>
                <article
                  className={cn(
                    "flex h-full flex-col gap-4 rounded-2xl border bg-card p-5",
                    status === "exceeded" && "border-[var(--status-critical)]/50",
                  )}
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        {bucket && (
                          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: `var(--${bucket})` }} aria-hidden />
                        )}
                        <span className="truncate">{label}</span>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {budget.period_start === null ? "Todos los meses" : "Solo este mes"}
                      </p>
                    </div>
                    <StatusLabel status={status} className="shrink-0" />
                  </header>

                  <div className="space-y-2">
                    <p className="text-base">
                      <span className="text-2xl font-semibold">{formatCurrency(used, currency)}</span>
                      <span className="text-muted-foreground"> de {formatCurrency(budget.amount, currency)}</span>
                    </p>
                    <Meter value={usage} color={statusFill(status)} label={`${label}: ${Math.round(usage * 100)} % usado`} className="h-3" />
                    <p className={cn("text-base font-medium", remaining < 0 && "text-danger")}>
                      {remaining >= 0
                        ? `Te quedan ${formatCurrency(remaining, currency)}`
                        : `Te pasaste por ${formatCurrency(-remaining, currency)}`}
                    </p>
                  </div>

                  <BudgetFormDialog
                    {...formProps}
                    budget={budget}
                    trigger={
                      <Button variant="outline" className="mt-auto h-11 w-full text-base">
                        <PencilIcon />
                        Editar
                      </Button>
                    }
                  />
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
