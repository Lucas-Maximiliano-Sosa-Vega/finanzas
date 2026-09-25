"use client";

import { PencilIcon, RotateCcwIcon } from "lucide-react";
import { useId, useState } from "react";

import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { FormFooter, SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import { BUCKETS, BUCKET_META, type Bucket, type RuleTargets } from "@/lib/finance/rule";
import { cn } from "@/lib/utils";

import { saveRuleSettings } from "../actions";

interface RuleEditDialogProps {
  targets: RuleTargets;
  alertThreshold: number;
}

const DEFAULT_SPLIT: Record<Bucket, string> = { needs: "50", wants: "30", savings: "20" };

/** Lápiz junto a "Regla 50/30/20": cambia el reparto sin salir del resumen. */
export function RuleEditDialog({ targets, alertThreshold }: RuleEditDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Editar reparto de ingresos"
      description="Qué parte de lo que cobras va a cada bloque. Deben sumar 100 %."
      trigger={
        <Button variant="outline" className="h-11 gap-2 border-primary/40 px-4 text-base text-primary hover:bg-info-soft hover:text-primary">
          <PencilIcon className="size-4" />
          Editar reparto
        </Button>
      }
    >
      {open && <RuleForm targets={targets} alertThreshold={alertThreshold} onDone={() => setOpen(false)} />}
    </FormDialog>
  );
}

function RuleForm({ targets, alertThreshold, onDone }: RuleEditDialogProps & { onDone: () => void }) {
  const { onSubmit, pending, errors } = useFormAction(saveRuleSettings, onDone);
  const id = useId();
  const [split, setSplit] = useState<Record<Bucket, string>>({
    needs: String(targets.needs),
    wants: String(targets.wants),
    savings: String(targets.savings),
  });
  const total = BUCKETS.reduce((sum, b) => sum + (Number(split[b]) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.001;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Vista previa del reparto */}
      <div className="space-y-2">
        <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          {BUCKETS.map((b) => (
            <div
              key={b}
              className="h-full transition-[width] duration-300 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${Math.min(Number(split[b]) || 0, 100)}%`, backgroundColor: `var(--${b})` }}
            />
          ))}
        </div>
        <p className={cn("text-base font-medium tabular-nums", isValid ? "text-success" : "text-danger")} aria-live="polite">
          {isValid ? "✓ Suma 100 %" : `Suman ${total} %: ${total > 100 ? `sobran ${total - 100}` : `faltan ${100 - total}`} puntos`}
        </p>
      </div>

      <div className="space-y-4">
        {BUCKETS.map((bucket) => (
          <Field key={bucket} label={BUCKET_META[bucket].label} htmlFor={`${id}-${bucket}`} errors={errors[`${bucket}_pct`]} hint={BUCKET_META[bucket].hint}>
            <div className="flex items-center gap-3">
              <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: `var(--${bucket})` }} aria-hidden />
              <Input
                id={`${id}-${bucket}`}
                name={`${bucket}_pct`}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                required
                value={split[bucket]}
                onChange={(e) => setSplit((s) => ({ ...s, [bucket]: e.target.value }))}
                className={cn(FIELD_CONTROL, "max-w-28 text-lg font-semibold tabular-nums md:text-lg")}
              />
              <span className="text-lg text-muted-foreground">%</span>
            </div>
          </Field>
        ))}
      </div>

      <Field
        label="Avisarme cuando llegue al…"
        htmlFor={`${id}-threshold`}
        errors={errors.alert_threshold_pct}
        hint="Porcentaje de cada límite a partir del cual verás un aviso amarillo."
      >
        <div className="flex items-center gap-3">
          <Input
            id={`${id}-threshold`}
            name="alert_threshold_pct"
            type="number"
            min="50"
            max="100"
            step="1"
            required
            defaultValue={alertThreshold}
            className={cn(FIELD_CONTROL, "max-w-28 text-lg font-semibold tabular-nums md:text-lg")}
          />
          <span className="text-lg text-muted-foreground">% del límite</span>
        </div>
      </Field>

      <FormFooter
        danger={
          <Button type="button" variant="ghost" size="lg" onClick={() => setSplit(DEFAULT_SPLIT)} className="text-muted-foreground">
            <RotateCcwIcon />
            Volver a 50/30/20
          </Button>
        }
      >
        <SubmitButton pending={pending}>Guardar reparto</SubmitButton>
      </FormFooter>
    </form>
  );
}
