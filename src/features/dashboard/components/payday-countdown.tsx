"use client";

import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PartyPopperIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Meter } from "@/components/meter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addMonths, daysInMonth, diffInDays, parseISODate, toISODate, weekdayMondayFirst, type ISODate } from "@/lib/finance/dates";
import type { PayCycle } from "@/lib/finance/pay-cycle";
import { formatLongDate, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

interface PaydayCountdownProps {
  today: ISODate;
  payday: number;
  cycle: PayCycle;
  className?: string;
}

export function PaydayCountdown({ today, payday, cycle, className }: PaydayCountdownProps) {
  const currentMonth = toISODate({ ...parseISODate(today), day: 1 });
  const [month, setMonth] = useState(currentMonth);
  const days = useMemo(() => buildMonthGrid(month), [month]);

  return (
    <Card className={cn("gap-5 rounded-2xl py-6", className)}>
      <CardHeader className="px-6">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDaysIcon className="size-5 text-primary" aria-hidden />
          Próximo cobro
        </CardTitle>
        <CardDescription className="text-base first-letter:uppercase">{formatLongDate(cycle.nextPayday)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        {cycle.isPayday ? (
          <p className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-success">
            <PartyPopperIcon className="size-8" aria-hidden />
            ¡Hoy cobras!
          </p>
        ) : (
          <p className="flex items-baseline gap-2" aria-live="polite">
            <span className="text-sm text-muted-foreground">Faltan</span>
            <span className="text-6xl font-semibold tracking-tighter text-primary">{cycle.daysUntilPayday}</span>
            <span className="text-xl text-muted-foreground">{cycle.daysUntilPayday === 1 ? "día" : "días"}</span>
          </p>
        )}

        <div className="space-y-2">
          <Meter
            value={cycle.elapsedDays / cycle.totalDays}
            color="var(--primary)"
            label="Progreso del ciclo de cobro"
            className="h-2.5"
          />
          <p className="text-sm text-muted-foreground">
            Día {cycle.elapsedDays} de {cycle.totalDays} del periodo
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(currentMonth)}
              disabled={month === currentMonth}
              className="text-base font-medium first-letter:uppercase transition-colors enabled:hover:text-muted-foreground disabled:cursor-default"
              title={month === currentMonth ? undefined : "Volver al mes actual"}
            >
              {formatMonthYear(month)}
            </button>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior">
                <ChevronLeftIcon />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente">
                <ChevronRightIcon />
              </Button>
            </div>
          </div>

          {/* Refuerzo visual del contador; para lectores de pantalla basta el texto de arriba. */}
          <div aria-hidden className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((date, i) => {
              if (!date) return <div key={`pad-${i}`} />;
              const { day } = parseISODate(date);
              const isPayday = day === payday;
              const isToday = date === today;
              const inCycle = date >= cycle.start && date <= cycle.end;
              const distance = diffInDays(today, date);

              return (
                <div
                  key={date}
                  title={describeDay(date, isPayday, distance)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md tabular-nums transition-colors",
                    inCycle && "bg-muted",
                    isToday && "ring-2 ring-primary",
                    isPayday && "bg-success-solid font-semibold text-white classic:text-background",
                    !inCycle && !isPayday && "text-muted-foreground",
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-success-solid" aria-hidden />
              Día de cobro
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded ring-2 ring-primary" aria-hidden />
              Hoy
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-muted" aria-hidden />
              Periodo actual
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/** Celdas del mes con huecos iniciales para empezar en lunes. */
function buildMonthGrid(firstOfMonth: ISODate): (ISODate | null)[] {
  const { year, month } = parseISODate(firstOfMonth);
  const leading = Array<null>(weekdayMondayFirst(firstOfMonth)).fill(null);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => toISODate({ year, month, day: i + 1 }));
  return [...leading, ...days];
}

function describeDay(date: ISODate, isPayday: boolean, distance: number): string {
  const base = formatLongDate(date);
  if (isPayday) {
    if (distance === 0) return `${base}: hoy es día de cobro`;
    return distance > 0 ? `${base}: día de cobro, faltan ${distance} días` : `${base}: día de cobro`;
  }
  return distance === 0 ? `${base}: hoy` : base;
}
