"use client";

import { useId, useState } from "react";

import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { FormFooter, SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/features/shared/queries";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";

import { saveTransfer } from "../actions";

interface TransferFormProps {
  accounts: Account[];
  today: string;
  trigger: React.ReactNode;
}

export function TransferFormDialog({ trigger, ...props }: TransferFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Transferir entre cuentas"
      description="Mueve dinero de una cuenta a otra, por ejemplo para pagar la tarjeta. No cuenta como gasto ni ingreso."
    >
      {open && <TransferForm {...props} onDone={() => setOpen(false)} />}
    </FormDialog>
  );
}

function TransferForm({ accounts, today, onDone }: Omit<TransferFormProps, "trigger"> & { onDone: () => void }) {
  const { onSubmit, pending, errors } = useFormAction(saveTransfer, onDone);
  const id = useId();
  const active = accounts.filter((a) => !a.is_archived);
  const [from, setFrom] = useState(active[0]?.id ?? "");
  const [to, setTo] = useState(active.find((a) => a.type === "credit_card")?.id ?? active[1]?.id ?? "");

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="¿Cuánto?" htmlFor={`${id}-amount`} errors={errors.amount}>
        <Input
          id={`${id}-amount`}
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          autoFocus
          placeholder="0"
          className="h-14 text-2xl font-semibold tabular-nums md:text-2xl"
          aria-invalid={Boolean(errors.amount)}
        />
      </Field>

      <Field label="¿De qué cuenta sale?" htmlFor={`${id}-from`} errors={errors.from_account_id}>
        <Select name="from_account_id" value={from} onValueChange={setFrom} required>
          <SelectTrigger id={`${id}-from`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue placeholder="Elige una cuenta" />
          </SelectTrigger>
          <SelectContent>
            {active.map((account) => (
              <SelectItem key={account.id} value={account.id} className="h-10 text-base">
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="¿A qué cuenta va?" htmlFor={`${id}-to`} errors={errors.to_account_id}>
        <Select name="to_account_id" value={to} onValueChange={setTo} required>
          <SelectTrigger id={`${id}-to`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue placeholder="Elige una cuenta" />
          </SelectTrigger>
          <SelectContent>
            {active.map((account) => (
              <SelectItem key={account.id} value={account.id} className="h-10 text-base">
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fecha" htmlFor={`${id}-date`} errors={errors.occurred_on}>
          <Input id={`${id}-date`} name="occurred_on" type="date" required defaultValue={today} className={FIELD_CONTROL} />
        </Field>
        <Field label="Nota (opcional)" htmlFor={`${id}-description`} errors={errors.description}>
          <Input
            id={`${id}-description`}
            name="description"
            maxLength={200}
            placeholder="Ej: pago de la tarjeta"
            className={FIELD_CONTROL}
          />
        </Field>
      </div>

      <FormFooter>
        <SubmitButton pending={pending}>Transferir</SubmitButton>
      </FormFooter>
    </form>
  );
}
