import { parseISODate, type ISODate } from "@/lib/finance/dates";

const LOCALE = "es";

// Crear un Intl.NumberFormat es costoso: se reutilizan por clave.
const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: number, currency: string, { compact = false } = {}): string {
  const key = `${currency}:${compact}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : undefined,
    });
    currencyFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

const percentFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** 55 → "55 %" */
export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)} %`;
}

/** 5 → "+5 pp", −2.5 → "−2,5 pp" */
export function formatPoints(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${percentFormatter.format(Math.abs(value))} pp`;
}

const shortDate = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });

function toUTCDate(date: ISODate): Date {
  const { year, month, day } = parseISODate(date);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "25 sept" */
export const formatShortDate = (date: ISODate) => shortDate.format(toUTCDate(date));
/** "sábado, 25 de octubre" */
export const formatLongDate = (date: ISODate) => longDate.format(toUTCDate(date));
/** "octubre de 2026" */
export const formatMonthYear = (date: ISODate) => monthYear.format(toUTCDate(date));

/** "25 ago – 24 sept" */
export const formatRange = (from: ISODate, to: ISODate) => `${formatShortDate(from)} – ${formatShortDate(to)}`;
