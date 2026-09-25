import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";

import { AlertsPanel } from "@/features/dashboard/components/alerts-panel";
import { BucketCard } from "@/features/dashboard/components/bucket-card";
import { DeviationHistory } from "@/features/dashboard/components/deviation-history";
import { PaydayCountdown } from "@/features/dashboard/components/payday-countdown";
import { RealtimeRefresh } from "@/features/dashboard/components/realtime-refresh";
import { SavingsProjection } from "@/features/dashboard/components/savings-projection";
import { SummaryTiles } from "@/features/dashboard/components/summary-tiles";
import { getDashboardData } from "@/features/dashboard/queries";
import { RuleEditDialog } from "@/features/settings/components/rule-edit-dialog";
import { getProfile } from "@/features/settings/queries";
import { getCatalog } from "@/features/shared/queries";
import { EntryButtons } from "@/features/transactions/components/entry-buttons";
import { formatLongDate, formatRange } from "@/lib/format";

export const metadata: Metadata = { title: "Resumen" };

export default async function DashboardPage() {
  const [data, catalog, profile] = await Promise.all([getDashboardData(), getCatalog(), getProfile()]);
  const { currency, cycle } = data;

  return (
    <div className="space-y-12">
      <RealtimeRefresh />

      {/* 1 · Saludo y acciones principales */}
      <section className="space-y-6">
        <header className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Hola</h1>
          <p className="text-lg text-muted-foreground first-letter:uppercase">
            Hoy es {formatLongDate(data.today)} · periodo del {formatRange(cycle.start, cycle.end)}
          </p>
        </header>
        <EntryButtons accounts={catalog.accounts} categories={catalog.categories} today={data.today} />
        {data.totals.income === 0 && (
          <p className="flex items-start gap-3 rounded-xl bg-info-soft p-4 text-base">
            <InfoIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            Aún no registraste ingresos en este periodo. Empieza con tu sueldo: el reparto 50/30/20 se calcula sobre lo
            que cobras.
          </p>
        )}
      </section>

      {/* 2 · Cómo voy este mes */}
      <section className="space-y-5" aria-labelledby="period-heading">
        <h2 id="period-heading" className="text-2xl font-semibold tracking-tight">
          Este mes
        </h2>
        {/* Izquierda: números y avisos (lo más importante, también primero en móvil). Derecha: calendario. */}
        <div className="grid items-start gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <SummaryTiles totals={data.totals} currency={currency} />
            <AlertsPanel buckets={data.buckets} alerts={data.alerts} currency={currency} />
          </div>
          <PaydayCountdown today={data.today} payday={data.payday} cycle={cycle} />
        </div>
      </section>

      {/* 3 · Regla 50/30/20 (editable con el lápiz) */}
      <section id="regla" className="scroll-mt-24 space-y-5" aria-labelledby="rule-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="rule-heading" className="text-2xl font-semibold tracking-tight">
              Reparto {data.targets.needs}/{data.targets.wants}/{data.targets.savings}
            </h2>
            <p className="text-base text-muted-foreground">Cómo se reparte lo que cobraste este mes.</p>
          </div>
          <RuleEditDialog targets={data.targets} alertThreshold={profile.alert_threshold_pct} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.buckets.map((status) => (
            <BucketCard key={status.bucket} status={status} currency={currency} />
          ))}
        </div>
      </section>

      {/* 4 · Futuro e historial */}
      <section className="space-y-5" aria-labelledby="future-heading">
        <h2 id="future-heading" className="text-2xl font-semibold tracking-tight">
          Tu ahorro y meses anteriores
        </h2>
        <SavingsProjection monthlySavings={data.averageMonthlySavings} currency={currency} />
        <DeviationHistory history={data.history} targets={data.targets} currency={currency} />
      </section>
    </div>
  );
}
