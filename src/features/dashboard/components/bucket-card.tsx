import { Meter } from "@/components/meter";
import { BUCKET_META, type BucketStatus } from "@/lib/finance/rule";
import { formatCurrency, formatPercent } from "@/lib/format";

import { StatusLabel, statusFill, toStatus } from "./status-label";

export function BucketCard({ status, currency }: { status: BucketStatus; currency: string }) {
  const { bucket, spent, limit, targetPct, actualPct, usage, level } = status;
  const meta = BUCKET_META[bucket];
  const isSavings = bucket === "savings";
  const remaining = limit - spent;
  const kind = toStatus(level, isSavings);
  const percentUsed = Number.isFinite(usage) ? Math.round(usage * 100) : null;

  return (
    <article className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--${bucket})` }} aria-hidden />
          {meta.label}
          <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium tabular-nums">
            {formatPercent(targetPct)}
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">{meta.hint}</p>
      </header>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{isSavings ? "Ahorrado" : "Gastado"}</p>
        <p className="text-3xl font-semibold tracking-tight">{formatCurrency(spent, currency)}</p>
        <p className="text-sm text-muted-foreground">
          {isSavings ? "Meta" : "Límite"}: {formatCurrency(limit, currency)}
        </p>
      </div>

      <div className="space-y-2">
        <Meter
          value={usage}
          color={statusFill(kind)}
          label={`${meta.label}: ${percentUsed ?? 100} % del ${isSavings ? "objetivo" : "límite"}`}
          className="h-3"
        />
        <p className="text-sm text-muted-foreground tabular-nums">
          {percentUsed === null ? "Sin ingresos todavía" : `${percentUsed} % ${isSavings ? "de la meta" : "del límite"}`}
          {actualPct !== null && ` · ${formatPercent(actualPct)} de lo que cobraste`}
        </p>
      </div>

      <div className="mt-auto space-y-3 border-t pt-4">
        <StatusLabel status={kind} />
        <p className="text-base font-medium">
          {isSavings
            ? remaining > 0
              ? `Te faltan ${formatCurrency(remaining, currency)} para la meta`
              : `Superaste la meta por ${formatCurrency(-remaining, currency)}`
            : remaining >= 0
              ? `Puedes gastar ${formatCurrency(remaining, currency)} más`
              : `Te pasaste por ${formatCurrency(-remaining, currency)}`}
        </p>
      </div>
    </article>
  );
}
