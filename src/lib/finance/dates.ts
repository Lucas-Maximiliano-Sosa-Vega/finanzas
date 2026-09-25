/**
 * Fechas de calendario como strings "YYYY-MM-DD" (mismo formato que el tipo
 * `date` de Postgres). Toda la aritmética se hace en UTC para no depender de
 * la zona horaria del servidor.
 */
export type ISODate = string;

const MS_PER_DAY = 86_400_000;

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

export function parseISODate(date: ISODate): DateParts {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export function toISODate({ year, month, day }: DateParts): ISODate {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function toUTCms(date: ISODate): number {
  const { year, month, day } = parseISODate(date);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(toUTCms(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Suma meses conservando el día (recortado al último día del mes destino). */
export function addMonths(date: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(date);
  const lastDay = daysInMonth(year, month + months);
  return toISODate({ year, month: month + months, day: Math.min(day, lastDay) });
}

/** Días naturales de `from` a `to` (positivo si `to` es posterior). */
export function diffInDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / MS_PER_DAY);
}

/** `month` admite desbordes (13 = enero del año siguiente). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Día de la semana con lunes = 0 … domingo = 6. */
export function weekdayMondayFirst(date: ISODate): number {
  return (new Date(toUTCms(date)).getUTCDay() + 6) % 7;
}

/** Fecha de hoy en la zona horaria del usuario. */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  try {
    // en-CA formatea como YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
