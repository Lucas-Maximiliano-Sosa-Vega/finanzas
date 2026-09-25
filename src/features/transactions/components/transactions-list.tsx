import { ArrowDownLeftIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";

import type { Category } from "@/features/categories/tree";
import { categoryLabel } from "@/features/categories/tree";
import type { Account } from "@/features/shared/queries";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { TransactionRow } from "../queries";
import { TransactionFormDialog } from "./transaction-form";

interface TransactionsListProps {
  transactions: TransactionRow[];
  accounts: Account[];
  categories: Category[];
  currency: string;
  today: string;
}

export function TransactionsList({ transactions, accounts, categories, currency, today }: TransactionsListProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  // Agrupados por día, del más reciente al más antiguo.
  const byDay = new Map<string, TransactionRow[]>();
  for (const t of transactions) byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Toca un movimiento para verlo, cambiarlo o eliminarlo.</p>
      {[...byDay].map(([day, rows]) => (
        <section key={day} className="space-y-2">
          <h2 className="px-1 text-base font-semibold first-letter:uppercase">
            {day === today ? "Hoy" : formatLongDate(day)}
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {rows.map((t) => {
              const category = categoryById.get(t.category_id);
              const isIncome = t.kind === "income";
              const Icon = isIncome ? ArrowDownLeftIcon : ArrowUpRightIcon;
              const name = category ? categoryLabel(category, categoryById) : "Sin categoría";

              return (
                <li key={t.id}>
                  <TransactionFormDialog
                    accounts={accounts}
                    categories={categories}
                    today={today}
                    transaction={t}
                    trigger={
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:px-5"
                      >
                        <span
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-full",
                            isIncome ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                          )}
                        >
                          <Icon className="size-5" aria-label={isIncome ? "Ingreso" : "Gasto"} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-medium">{t.description || name}</span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {t.description ? `${name} · ` : ""}
                            {accountById.get(t.account_id)?.name ?? "—"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-base font-semibold tabular-nums sm:text-lg",
                            isIncome ? "text-money-in" : "text-money-out",
                          )}
                        >
                          {isIncome ? "+" : "−"}
                          {formatCurrency(t.amount, currency)}
                        </span>
                        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
