import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Tonos: verde = entra/bien, rojo = sale/alerta, azul = neutro/informativo. */
const TONES = {
  success: { icon: "bg-success-soft text-success", value: "text-money-in" },
  danger: { icon: "bg-danger-soft text-danger", value: "text-money-out" },
  info: { icon: "bg-info-soft text-primary", value: "text-foreground" },
  savings: { icon: "bg-[color-mix(in_oklab,var(--savings)_15%,transparent)] text-[var(--savings)]", value: "text-foreground" },
} as const;

export type StatTone = keyof typeof TONES;

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatTone;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, tone, hint, className }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border bg-card p-5", className)}>
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", t.icon)}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={cn("truncate text-2xl font-semibold tracking-tight", t.value)}>{value}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
