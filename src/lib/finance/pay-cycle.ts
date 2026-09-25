import { addDays, addMonths, diffInDays, parseISODate, toISODate, type ISODate } from "./dates";

/**
 * Ciclo de cobro: del día de cobro (incluido) al día anterior del siguiente
 * cobro. Con payday = 25: 25 sep → 24 oct. Es el "mes" financiero de la app
 * y coincide con `public.pay_cycle_start` en la base de datos.
 */
export interface PayCycle {
  start: ISODate;
  end: ISODate;
  nextPayday: ISODate;
  totalDays: number;
  /** Días transcurridos contando hoy (1 el día de cobro). */
  elapsedDays: number;
  daysUntilPayday: number;
  isPayday: boolean;
}

export function payCycleStart(date: ISODate, payday: number): ISODate {
  const { year, month, day } = parseISODate(date);
  const thisMonth = toISODate({ year, month, day: payday });
  return day >= payday ? thisMonth : addMonths(thisMonth, -1);
}

export function getPayCycle(today: ISODate, payday: number): PayCycle {
  const start = payCycleStart(today, payday);
  const nextPayday = addMonths(start, 1);

  return {
    start,
    end: addDays(nextPayday, -1),
    nextPayday,
    totalDays: diffInDays(start, nextPayday),
    elapsedDays: diffInDays(start, today) + 1,
    daysUntilPayday: diffInDays(today, nextPayday),
    isPayday: today === start,
  };
}

/** Inicios de los `count` ciclos anteriores al que empieza en `cycleStart`, del más reciente al más antiguo. */
export function previousCycleStarts(cycleStart: ISODate, count: number): ISODate[] {
  return Array.from({ length: count }, (_, i) => addMonths(cycleStart, -(i + 1)));
}
