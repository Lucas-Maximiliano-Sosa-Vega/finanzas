import { CircleCheckIcon, OctagonAlertIcon, PiggyBankIcon, TrophyIcon, TriangleAlertIcon } from "lucide-react";

import type { AlertLevel } from "@/lib/finance/rule";
import { cn } from "@/lib/utils";

/** Semáforo: verde = bien, ámbar = cuidado, rojo = alerta. Siempre con icono + texto. */
const STATUS = {
  ok: {
    label: "Vas bien",
    icon: CircleCheckIcon,
    className: "bg-success-soft text-success",
  },
  warning: {
    label: "Cuidado, cerca del límite",
    icon: TriangleAlertIcon,
    className: "bg-warning-soft text-amber-800 dark:text-amber-300",
  },
  exceeded: {
    label: "Te pasaste del límite",
    icon: OctagonAlertIcon,
    className: "bg-danger-soft text-danger",
  },
  achieved: {
    label: "¡Meta cumplida!",
    icon: TrophyIcon,
    className: "bg-success-soft text-success",
  },
  pending: {
    label: "Ahorrando",
    icon: PiggyBankIcon,
    className: "bg-info-soft text-primary",
  },
} as const;

export type StatusKind = keyof typeof STATUS;

/** Color de relleno de barras según el estado. */
export function statusFill(status: StatusKind): string {
  switch (status) {
    case "warning":
      return "var(--status-warning)";
    case "exceeded":
      return "var(--status-critical)";
    case "pending":
      return "var(--primary)";
    default:
      return "var(--status-good)";
  }
}

export function toStatus(level: AlertLevel, isSavings = false): StatusKind {
  return isSavings && level === "ok" ? "pending" : level;
}

export function StatusLabel({ status, className }: { status: StatusKind; className?: string }) {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
