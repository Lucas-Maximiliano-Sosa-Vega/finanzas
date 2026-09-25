import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { addDays, addMonths, parseISODate, type ISODate } from "@/lib/finance/dates";
import { formatRange } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Lee `?ciclo=YYYY-MM-DD` y lo valida contra el día de cobro; si no, usa el actual. */
export function resolveCycle(param: string | string[] | undefined, payday: number, currentStart: ISODate) {
  const value = typeof param === "string" && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : null;
  const start = value && parseISODate(value).day === payday ? value : currentStart;
  return { start, end: addDays(addMonths(start, 1), -1), isCurrent: start === currentStart };
}

/** Navegación entre periodos con botones grandes y texto: "Anterior" / "Siguiente". */
export function CycleNav({ basePath, start, end, currentStart }: { basePath: string; start: ISODate; end: ISODate; currentStart: ISODate }) {
  const href = (cycle: ISODate) => (cycle === currentStart ? basePath : `${basePath}?ciclo=${cycle}`);
  const isCurrent = start >= currentStart;

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-2" aria-label="Cambiar periodo">
      <Button variant="ghost" asChild className="h-11 text-base">
        <Link href={href(addMonths(start, -1))} scroll={false}>
          <ChevronLeftIcon className="size-5" />
          Anterior
        </Link>
      </Button>
      <div className="text-center">
        <p className="text-base font-semibold tabular-nums">{formatRange(start, end)}</p>
        <p className="text-sm text-muted-foreground">{isCurrent ? "Periodo actual" : "Periodo pasado"}</p>
      </div>
      <Button variant="ghost" asChild className={cn("h-11 text-base", isCurrent && "invisible")}>
        <Link href={href(addMonths(start, 1))} scroll={false} aria-hidden={isCurrent} tabIndex={isCurrent ? -1 : undefined}>
          Siguiente
          <ChevronRightIcon className="size-5" />
        </Link>
      </Button>
    </nav>
  );
}
