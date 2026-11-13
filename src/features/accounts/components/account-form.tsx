"use client";

import { useId, useState } from "react";

import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { FormFooter, SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/features/shared/queries";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";

import { deleteAccount, saveAccount } from "../actions";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_VALUES } from "../labels";
import { ArchiveButton } from "./archive-button";

export function AccountFormDialog({
  account,
  creditLimit,
  trigger,
}: {
  account?: Account;
  creditLimit?: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={account ? `Editar «${account.name}»` : "Nueva cuenta"}
      description={account ? undefined : "Dónde tienes tu dinero: efectivo, banco, tarjetas…"}
    >
      {open && <AccountForm account={account} creditLimit={creditLimit} onDone={() => setOpen(false)} />}
    </FormDialog>
  );
}

function AccountForm({ account, creditLimit, onDone }: { account?: Account; creditLimit?: number; onDone: () => void }) {
  const { onSubmit, pending, errors } = useFormAction(saveAccount, onDone);
  const id = useId();
  const [type, setType] = useState<string>(account?.type ?? "checking");

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field label="Nombre" htmlFor={`${id}-name`} errors={errors.name}>
        <Input
          id={`${id}-name`}
          name="name"
          required
          maxLength={60}
          autoFocus
          defaultValue={account?.name}
          placeholder="Ej: Tarjeta Visa"
          aria-invalid={Boolean(errors.name)}
          className={FIELD_CONTROL}
        />
      </Field>

      <Field label="Tipo de cuenta" htmlFor={`${id}-type`} errors={errors.type}>
        <Select name="type" value={type} onValueChange={setType} required>
          <SelectTrigger id={`${id}-type`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPE_VALUES.map((type) => {
              const { label, icon: Icon } = ACCOUNT_TYPES[type];
              return (
                <SelectItem key={type} value={type} className="h-10 text-base">
                  <Icon />
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </Field>

      {type === "credit_card" && (
        <Field
          label="Límite de la tarjeta"
          htmlFor={`${id}-limit`}
          errors={errors.credit_limit}
          hint="Opcional. Con el límite, la tarjeta muestra cuánto te queda disponible."
        >
          <Input
            id={`${id}-limit`}
            name="credit_limit"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={creditLimit}
            placeholder="Ej: 3400000"
            className={cn(FIELD_CONTROL, "tabular-nums")}
          />
        </Field>
      )}

      <Field
        label="¿Cuánto había al empezar?"
        htmlFor={`${id}-balance`}
        errors={errors.initial_balance}
        hint="Si es una deuda (por ejemplo, una tarjeta), pon el número en negativo."
      >
        <Input
          id={`${id}-balance`}
          name="initial_balance"
          type="number"
          inputMode="decimal"
          step="0.01"
          defaultValue={account?.initial_balance ?? 0}
          className={cn(FIELD_CONTROL, "tabular-nums")}
        />
      </Field>

      <FormFooter
        danger={
          account && (
            <div className="flex flex-wrap gap-1">
              <ArchiveButton id={account.id} archived={account.is_archived} onDone={onDone} />
              <ConfirmDelete
                title={`¿Eliminar «${account.name}»?`}
                description="Solo se puede eliminar si no tiene movimientos. Si los tiene, usa «Archivar» para ocultarla."
                onConfirm={() => deleteAccount(account.id)}
                onDeleted={onDone}
              />
            </div>
          )
        }
      >
        <SubmitButton pending={pending}>{account ? "Guardar cambios" : "Crear cuenta"}</SubmitButton>
      </FormFooter>
    </form>
  );
}
