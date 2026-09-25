import { ArrowDownLeftIcon, ArrowUpRightIcon, ReceiptTextIcon, ScaleIcon } from "lucide-react";
import type { Metadata } from "next";

import { CycleNav, resolveCycle } from "@/components/cycle-nav";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentCycle, getProfile } from "@/features/settings/queries";
import { getCatalog } from "@/features/shared/queries";
import { EntryButtons } from "@/features/transactions/components/entry-buttons";
import { TransactionsList } from "@/features/transactions/components/transactions-list";
import { listTransactions } from "@/features/transactions/queries";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Movimientos" };

export default async function TransactionsPage({ searchParams }: PageProps<"/movimientos">) {
  const [{ ciclo }, profile, { today, cycle: current }, catalog] = await Promise.all([
    searchParams,
    getProfile(),
    getCurrentCycle(),
    getCatalog(),
  ]);
  const { start, end } = resolveCycle(ciclo, profile.payday, current.start);
  const transactions = await listTransactions(start, end);

  const income = transactions.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const { currency } = profile;

  return (
    <div className="space-y-10">
      <PageHeader title="Movimientos" description="Todo el dinero que entra y sale, mes a mes (del 25 al 24)." />

      <EntryButtons accounts={catalog.accounts} categories={catalog.categories} today={today} />

      <section className="space-y-5" aria-label="Movimientos del ciclo">
        <CycleNav basePath="/movimientos" start={start} end={end} currentStart={current.start} />

        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard label="Entró" value={formatCurrency(income, currency)} icon={ArrowDownLeftIcon} tone="success" />
          <StatCard label="Salió" value={formatCurrency(expenses, currency)} icon={ArrowUpRightIcon} tone="danger" />
          <StatCard
            label="Diferencia"
            value={formatCurrency(balance, currency)}
            icon={ScaleIcon}
            tone={balance < 0 ? "danger" : "info"}
          />
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
            <ReceiptTextIcon className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-lg font-medium">Todavía no hay movimientos en este periodo</p>
            <p className="max-w-sm text-base text-muted-foreground">
              Usa los botones de arriba para registrar tu sueldo y tus gastos.
            </p>
          </div>
        ) : (
          <TransactionsList
            transactions={transactions}
            accounts={catalog.accounts}
            categories={catalog.categories}
            currency={currency}
            today={today}
          />
        )}
      </section>
    </div>
  );
}
