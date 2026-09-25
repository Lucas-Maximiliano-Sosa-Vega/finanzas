"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { FormDialog } from "@/components/forms/form-dialog";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";

import { savePayday } from "../actions";

// 1-28: mismo límite que la base de datos, para que exista en todos los meses (incluido febrero).
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** Lápiz junto a "Próximo cobro": cada persona puede tener un día de cobro distinto. */
export function PaydayEditDialog({ payday }: { payday: number }) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="¿Qué día cobrás?"
      description="El día del mes en que te pagan. A partir de ahí contamos cada periodo."
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cambiar día de cobro"
          className="text-muted-foreground hover:text-primary"
        >
          <PencilIcon className="size-4" />
        </Button>
      }
    >
      {open && <PaydayForm payday={payday} onDone={() => setOpen(false)} />}
    </FormDialog>
  );
}

function PaydayForm({ payday, onDone }: { payday: number; onDone: () => void }) {
  const { onSubmit, pending } = useFormAction(savePayday, onDone);
  const [selected, setSelected] = useState(payday);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="payday" value={selected} />

      <div role="radiogroup" aria-label="Día de cobro" className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(day)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-base font-medium tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        Cobrás el día <span className="font-semibold text-foreground">{selected}</span> de cada mes. Los presupuestos
        puntuales de otros periodos (no los que se repiten) pueden quedar sin efecto si cambiás esto.
      </p>

      <div className="flex justify-end border-t pt-5">
        <SubmitButton pending={pending}>Guardar</SubmitButton>
      </div>
    </form>
  );
}
