import { HistoryIcon, TriangleAlertIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BUCKETS, BUCKET_META, type Bucket, type RuleTargets } from "@/lib/finance/rule";
import { formatCurrency, formatPercent, formatPoints, formatRange } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { HistoryEntry } from "../queries";

/** Desvíos menores a este margen (pp) se consideran dentro de la regla. */
const TOLERANCE_PTS = 1;

interface DeviationHistoryProps {
  history: HistoryEntry[];
  targets: RuleTargets;
  currency: string;
}

export function DeviationHistory({ history, targets, currency }: DeviationHistoryProps) {
  const withIncome = history.filter((entry) => entry.deviation !== null);

  return (
    <Card className="gap-6 rounded-2xl py-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HistoryIcon className="size-5 text-primary" aria-hidden />
          Historial de desvíos
        </CardTitle>
        <CardDescription className="text-base">{headline(history[0])}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <Legend />

        {withIncome.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay ciclos cerrados con ingresos para comparar.
          </p>
        ) : (
          <table className="w-full border-separate border-spacing-y-3 text-sm">
            <caption className="sr-only">Distribución real de ingresos por ciclo frente a la regla 50/30/20</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Ciclo</th>
                <th scope="col">Distribución</th>
                {BUCKETS.map((bucket) => (
                  <th key={bucket} scope="col">
                    {BUCKET_META[bucket].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-muted-foreground">
                <th scope="row" className="w-32 pr-4 text-left text-sm font-normal whitespace-nowrap">
                  Objetivo
                </th>
                <td className="w-full">
                  <SplitBar parts={BUCKETS.map((bucket) => ({ bucket, pct: targets[bucket] }))} muted />
                </td>
                {BUCKETS.map((bucket) => (
                  <td key={bucket} className="hidden pl-4 text-right text-sm whitespace-nowrap tabular-nums sm:table-cell">
                    {formatPercent(targets[bucket])}
                  </td>
                ))}
              </tr>

              {withIncome.map((entry) => (
                <tr key={entry.cycleStart}>
                  <th scope="row" className="pr-4 text-left text-sm font-normal whitespace-nowrap text-muted-foreground">
                    {formatRange(entry.cycleStart, entry.cycleEnd)}
                  </th>
                  <td>
                    <SplitBar
                      parts={(entry.deviation ?? []).map((d) => ({
                        bucket: d.bucket,
                        pct: d.actualPct,
                        tooltip: `${BUCKET_META[d.bucket].label}: ${formatPercent(d.actualPct)} (${formatPoints(d.deviationPts)}) · ${formatCurrency(entry.totals[d.bucket], currency)}`,
                      }))}
                    />
                  </td>
                  {(entry.deviation ?? []).map((d) => {
                    const flagged = d.isUnfavorable && Math.abs(d.deviationPts) >= TOLERANCE_PTS;
                    return (
                      <td key={d.bucket} className="hidden pl-4 text-right text-sm whitespace-nowrap tabular-nums sm:table-cell">
                        <span className={cn("inline-flex items-center gap-1", flagged ? "font-medium" : "text-muted-foreground")}>
                          {flagged && <TriangleAlertIcon className="size-3 text-status-warning" aria-label="Desvío desfavorable" />}
                          {formatPercent(d.actualPct)}
                          <span className="text-muted-foreground">{formatPoints(d.deviationPts)}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function headline(lastCycle: HistoryEntry | undefined): string {
  if (!lastCycle?.deviation) return "Compara cada ciclo cerrado con tu regla 50/30/20.";

  const worst = lastCycle.deviation
    .filter((d) => d.isUnfavorable && Math.abs(d.deviationPts) >= TOLERANCE_PTS)
    .sort((a, b) => Math.abs(b.deviationPts) - Math.abs(a.deviationPts))[0];

  if (!worst) return "El ciclo pasado cumpliste la regla 50/30/20. ¡Bien hecho!";

  const label = BUCKET_META[worst.bucket].label.toLowerCase();
  const verb = worst.bucket === "savings" ? "destinaste" : "gastaste";
  return `El ciclo pasado ${verb} un ${formatPercent(worst.actualPct)} en ${label}: un desvío de ${formatPoints(worst.deviationPts)} sobre el ${formatPercent(worst.targetPct)} objetivo.`;
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground" aria-label="Leyenda">
      {BUCKETS.map((bucket) => (
        <li key={bucket} className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ backgroundColor: `var(--${bucket})` }} aria-hidden />
          {BUCKET_META[bucket].label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-2 rounded-sm bg-muted" aria-hidden />
        Sin asignar
      </li>
    </ul>
  );
}

interface SplitPart {
  bucket: Bucket;
  pct: number;
  tooltip?: string;
}

/** Barra apilada 0-100 % con 2px de separación entre segmentos. */
function SplitBar({ parts, muted = false }: { parts: SplitPart[]; muted?: boolean }) {
  const total = parts.reduce((sum, p) => sum + p.pct, 0);
  // Si se gastó más que lo ingresado, la barra se normaliza al total.
  const scale = total > 100 ? 100 / total : 1;

  return (
    <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
      {parts.map(({ bucket, pct, tooltip }) => {
        if (pct <= 0) return null;
        const segment = (
          <div
            key={bucket}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", muted && "opacity-35")}
            style={{ width: `${pct * scale}%`, backgroundColor: `var(--${bucket})` }}
          />
        );
        if (!tooltip) return segment;
        return (
          <Tooltip key={bucket}>
            <TooltipTrigger asChild>{segment}</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
