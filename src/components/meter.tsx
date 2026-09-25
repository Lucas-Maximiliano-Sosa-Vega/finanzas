import { cn } from "@/lib/utils";

interface MeterProps {
  /** 1 = 100 %. Valores > 1 se muestran llenos. */
  value: number;
  /** Color CSS del relleno; la pista usa un tono más claro del mismo color. */
  color: string;
  label: string;
  className?: string;
}

/** Barra de progreso sin JS de cliente (renderizable en Server Components). */
export function Meter({ value, color, label, className }: MeterProps) {
  const safe = Number.isFinite(value) ? Math.max(value, 0) : 1;
  const width = Math.min(safe, 1) * 100;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe * 100)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}
