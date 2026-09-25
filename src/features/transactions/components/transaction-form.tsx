"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";
import { useId, useState } from "react";

import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { FormFooter, SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryOptions } from "@/features/categories/components/category-options";
import type { Category } from "@/features/categories/tree";
import type { Account } from "@/features/shared/queries";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

import { deleteTransaction, saveTransaction } from "../actions";
import type { TransactionRow } from "../queries";

type Kind = Enums<"transaction_kind">;

export interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  today: string;
  transaction?: TransactionRow;
  defaultKind?: Kind;
  trigger: React.ReactNode;
}

export function TransactionFormDialog({ trigger, transaction, defaultKind, ...props }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const title = transaction
    ? "Editar movimiento"
    : defaultKind === "income"
      ? "Registrar ingreso"
      : defaultKind === "expense"
        ? "Registrar gasto"
        : "Nuevo movimiento";

  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={title}>
      {/* Se monta al abrir: el formulario empieza limpio cada vez. */}
      {open && (
        <TransactionForm {...props} transaction={transaction} defaultKind={defaultKind} onDone={() => setOpen(false)} />
      )}
    </FormDialog>
  );
}

const KINDS = [
  {
    value: "expense",
    label: "Gasto",
    hint: "Dinero que sale",
    icon: ArrowUpRightIcon,
    active: "border-danger bg-danger-soft text-danger",
  },
  {
    value: "income",
    label: "Ingreso",
    hint: "Dinero que entra",
    icon: ArrowDownLeftIcon,
    active: "border-success bg-success-soft text-success",
  },
] as const;

function TransactionForm({
  accounts,
  categories,
  today,
  transaction,
  defaultKind = "expense",
  onDone,
}: Omit<TransactionFormProps, "trigger"> & { onDone: () => void }) {
  const { onSubmit, pending, errors } = useFormAction(saveTransaction, onDone);
  const [kind, setKind] = useState<Kind>(transaction?.kind ?? defaultKind);
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const id = useId();

  const activeAccounts = accounts.filter((a) => !a.is_archived || a.id === transaction?.account_id);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">¿Qué quieres registrar?</legend>
        <div className="grid grid-cols-2 gap-3">
          {KINDS.map(({ value, label, hint, icon: Icon, active }) => {
            const selected = kind === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (selected) return;
                  setKind(value);
                  setCategoryId("");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected ? active : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-6" aria-hidden />
                <span className="text-base font-semibold">{label}</span>
                <span className="text-xs">{hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

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
          defaultValue={transaction?.amount}
          placeholder="0"
          className="h-14 text-2xl font-semibold tabular-nums md:text-2xl"
          aria-invalid={Boolean(errors.amount)}
        />
      </Field>

      <Field label={kind === "expense" ? "¿En qué lo gastaste?" : "¿De dónde vino?"} htmlFor={`${id}-category`} errors={errors.category_id}>
        <Select name="category_id" value={categoryId} onValueChange={setCategoryId} required>
          <SelectTrigger id={`${id}-category`} className={cn("w-full", FIELD_CONTROL)} aria-invalid={Boolean(errors.category_id)}>
            <SelectValue placeholder="Elige una categoría" />
          </SelectTrigger>
          <SelectContent>
            <CategoryOptions categories={categories} kind={kind} />
          </SelectContent>
        </Select>
      </Field>

      <Field label={kind === "expense" ? "¿De qué cuenta salió?" : "¿A qué cuenta entró?"} htmlFor={`${id}-account`} errors={errors.account_id}>
        <Select name="account_id" defaultValue={transaction?.account_id ?? activeAccounts[0]?.id} required>
          <SelectTrigger id={`${id}-account`} className={cn("w-full", FIELD_CONTROL)} aria-invalid={Boolean(errors.account_id)}>
            <SelectValue placeholder="Elige una cuenta" />
          </SelectTrigger>
          <SelectContent>
            {activeAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id} className="h-10 text-base">
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fecha" htmlFor={`${id}-date`} errors={errors.occurred_on}>
          <Input
            id={`${id}-date`}
            name="occurred_on"
            type="date"
            required
            defaultValue={transaction?.occurred_on ?? today}
            className={FIELD_CONTROL}
          />
        </Field>
        <Field label="Nota (opcional)" htmlFor={`${id}-description`} errors={errors.description}>
          <Input
            id={`${id}-description`}
            name="description"
            maxLength={200}
            defaultValue={transaction?.description ?? ""}
            placeholder={kind === "expense" ? "Ej: compra semanal" : "Ej: sueldo de septiembre"}
            className={FIELD_CONTROL}
          />
        </Field>
      </div>

      <FormFooter
        danger={
          transaction && (
            <ConfirmDelete
              title="¿Eliminar este movimiento?"
              description="Se borrará para siempre. Esta acción no se puede deshacer."
              onConfirm={() => deleteTransaction(transaction.id)}
              onDeleted={onDone}
            />
          )
        }
      >
        <SubmitButton pending={pending}>{transaction ? "Guardar cambios" : "Guardar"}</SubmitButton>
      </FormFooter>
    </form>
  );
}
