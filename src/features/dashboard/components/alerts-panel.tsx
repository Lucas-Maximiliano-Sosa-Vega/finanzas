import { BellIcon, CircleCheckIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";

import { Meter } from "@/components/meter";
import { BUCKET_META, type BucketStatus, type SpendingAlert } from "@/lib/finance/rule";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import { statusFill } from "./status-label";

interface AlertsPanelProps {
  buckets: BucketStatus[];
  alerts: SpendingAlert[];
  currency: string;
  className?: string;
}

interface AlertItem {
  id: string;
  label: string;
  source: string;
  spent: number;
  limit: number;
  usage: number;
  level: SpendingAlert["level"];
}

export function AlertsPanel({ buckets, alerts, currency, className }: AlertsPanelProps) {
  const items: AlertItem[] = [
    // Los bloques de la regla en alerta van primero.
    ...buckets.flatMap((b): AlertItem[] =>
      b.level === "warning" || b.level === "exceeded"
        ? [{ id: `bucket:${b.bucket}`, label: BUCKET_META[b.bucket].label, source: "Regla 50/30/20", ...b, level: b.level }]
        : [],
    ),
    ...alerts.map((a) => ({ ...a, source: a.source === "budget" ? "Presupuesto" : "Tope de la categoría" })),
  ];
  const exceeded = items.filter((i) => i.level === "exceeded").length;

  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-6", className)} aria-labelledby="alerts-heading">
      <header className="flex items-center justify-between gap-3">
        <h2 id="alerts-heading" className="flex items-center gap-2 text-lg font-semibold">
          <BellIcon className="size-5" aria-hidden />
          Avisos
        </h2>
        {items.length > 0 && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              exceeded > 0 ? "bg-danger-soft text-danger" : "bg-warning-soft text-amber-800 dark:text-amber-300",
            )}
          >
            {items.length} {items.length === 1 ? "aviso" : "avisos"}
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-success-soft px-4 py-10 text-center">
          <CircleCheckIcon className="size-10 text-success" aria-hidden />
          <p className="text-lg font-semibold text-success">Todo en orden</p>
          <p className="text-base text-muted-foreground">Ningún gasto se acerca a su límite.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isExceeded = item.level === "exceeded";
            const Icon = isExceeded ? OctagonAlertIcon : TriangleAlertIcon;
            const diff = Math.abs(item.limit - item.spent);
            return (
              <li
                key={item.id}
                className={cn(
                  "space-y-3 rounded-xl border-l-4 p-4",
                  isExceeded ? "border-l-[var(--status-critical)] bg-danger-soft" : "border-l-[var(--status-warning)] bg-warning-soft",
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={cn("mt-0.5 size-6 shrink-0", isExceeded ? "text-danger" : "text-amber-600 dark:text-amber-300")}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-base font-semibold">
                      {item.label}: {isExceeded ? "te pasaste del límite" : "cerca del límite"}
                    </p>
                    <p className="text-base">
                      {isExceeded
                        ? `Gastaste ${formatCurrency(diff, currency)} de más.`
                        : `Solo te quedan ${formatCurrency(diff, currency)}.`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.spent, currency)} de {formatCurrency(item.limit, currency)} · {item.source}
                    </p>
                  </div>
                </div>
                <Meter value={item.usage} color={statusFill(item.level)} label={item.label} className="h-2.5" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
