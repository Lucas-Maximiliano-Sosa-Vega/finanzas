"use client";

import { useId, useState } from "react";

import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { FormFooter, SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CategoryOptions } from "@/features/categories/components/category-options";
import type { Category } from "@/features/categories/tree";
import { useFormAction } from "@/hooks/use-form-action";
import { NONE } from "@/lib/actions";
import { cn } from "@/lib/utils";

import { deleteBudget, saveBudget } from "../actions";
import type { BudgetRow } from "../queries";

interface BudgetFormProps {
  categories: Category[];
  cycleStart: string;
  cycleLabel: string;
  budget?: BudgetRow;
  trigger: React.ReactNode;
}

export function BudgetFormDialog({ trigger, budget, ...props }: BudgetFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={budget ? "Editar presupuesto" : "Nuevo presupuesto"}
      description="Cuánto como máximo quieres gastar al mes, en total o en algo concreto."
    >
      {open && <BudgetForm {...props} budget={budget} onDone={() => setOpen(false)} />}
    </FormDialog>
  );
}

function BudgetForm({
  categories,
  cycleStart,
  cycleLabel,
  budget,
  onDone,
}: Omit<BudgetFormProps, "trigger"> & { onDone: () => void }) {
  const { onSubmit, pending, errors } = useFormAction(saveBudget, onDone);
  const [recurring, setRecurring] = useState(budget ? budget.period_start === null : true);
  const id = useId();

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {budget && <input type="hidden" name="id" value={budget.id} />}
      <input type="hidden" name="cycle_start" value={budget?.period_start ?? cycleStart} />

      <Field label="¿Para qué es el límite?" htmlFor={`${id}-category`} errors={errors.category_id}>
        <Select name="category_id" defaultValue={budget ? (budget.category_id ?? NONE) : NONE}>
          <SelectTrigger id={`${id}-category`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>Todos mis gastos (total del mes)</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <CategoryOptions categories={categories} kind="expense" />
          </SelectContent>
        </Select>
      </Field>

      <Field label="Límite (máximo a gastar)" htmlFor={`${id}-amount`} errors={errors.amount}>
        <Input
          id={`${id}-amount`}
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          autoFocus
          defaultValue={budget?.amount}
          className="h-14 text-2xl font-semibold tabular-nums md:text-2xl"
          aria-invalid={Boolean(errors.amount)}
        />
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-4">
        <div className="space-y-1">
          <Label htmlFor={`${id}-recurring`} className="text-base">
            Repetir todos los meses
          </Label>
          <p className="text-sm text-muted-foreground">
            {recurring ? "Se aplica todos los meses." : `Solo para ${cycleLabel}.`}
          </p>
        </div>
        <Switch id={`${id}-recurring`} name="recurring" checked={recurring} onCheckedChange={setRecurring} className="scale-125" />
      </div>

      <FormFooter
        danger={
          budget && (
            <ConfirmDelete
              title="¿Eliminar este presupuesto?"
              description="Dejarás de recibir avisos sobre este límite."
              onConfirm={() => deleteBudget(budget.id)}
              onDeleted={onDone}
            />
          )
        }
      >
        <SubmitButton pending={pending}>{budget ? "Guardar cambios" : "Crear presupuesto"}</SubmitButton>
      </FormFooter>
    </form>
  );
}
