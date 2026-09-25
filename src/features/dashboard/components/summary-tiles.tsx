import { ArrowDownLeftIcon, ArrowUpRightIcon, PiggyBankIcon, WalletIcon } from "lucide-react";

import { StatCard } from "@/components/stat-card";
import type { CycleTotals } from "@/lib/finance/rule";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SummaryTiles({ totals, currency, className }: { totals: CycleTotals; currency: string; className?: string }) {
  const spent = totals.needs + totals.wants;
  const available = totals.income - spent - totals.savings;

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <StatCard label="Cobraste" value={formatCurrency(totals.income, currency)} icon={ArrowDownLeftIcon} tone="success" />
      <StatCard label="Gastaste" value={formatCurrency(spent, currency)} icon={ArrowUpRightIcon} tone="danger" />
      <StatCard label="Ahorraste" value={formatCurrency(totals.savings, currency)} icon={PiggyBankIcon} tone="savings" />
      <StatCard
        label="Te queda"
        value={formatCurrency(available, currency)}
        icon={WalletIcon}
        tone={available < 0 ? "danger" : "info"}
        hint={available < 0 ? "Gastaste más de lo que cobraste" : undefined}
      />
    </div>
  );
}
