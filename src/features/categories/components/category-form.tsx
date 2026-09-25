"use client";

import { useId, useState } from "react";

import { ConfirmDelete } from "@/components/forms/confirm-delete";
import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { FormFooter, SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFormAction } from "@/hooks/use-form-action";
import { NONE } from "@/lib/actions";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/finance/rule";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

import { deleteCategory, saveCategory } from "../actions";
import type { Category } from "../tree";

type Kind = Enums<"transaction_kind">;

export interface CategoryFormProps {
  categories: Category[];
  /** Si existe, se edita. */
  category?: Category;
  /** Valores iniciales al crear (p. ej. "añadir subcategoría"). */
  defaults?: { kind?: Kind; bucket?: Bucket; parentId?: string };
  trigger: React.ReactNode;
}

export function CategoryFormDialog({ trigger, category, defaults, categories }: CategoryFormProps) {
  const [open, setOpen] = useState(false);
  const parent = defaults?.parentId ? categories.find((c) => c.id === defaults.parentId) : undefined;

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={category ? "Editar categoría" : parent ? `Nueva subcategoría de ${parent.name}` : "Nueva categoría"}
    >
      {open && (
        <CategoryForm categories={categories} category={category} defaults={defaults} onDone={() => setOpen(false)} />
      )}
    </FormDialog>
  );
}

function CategoryForm({
  categories,
  category,
  defaults,
  onDone,
}: Omit<CategoryFormProps, "trigger"> & { onDone: () => void }) {
  const { onSubmit, pending, errors } = useFormAction(saveCategory, onDone);
  const id = useId();

  const [kind, setKind] = useState<Kind>(category?.kind ?? defaults?.kind ?? "expense");
  const [parentId, setParentId] = useState(category?.parent_id ?? defaults?.parentId ?? NONE);
  const [bucket, setBucket] = useState<string>(category?.bucket ?? defaults?.bucket ?? "");

  const hasChildren = category ? categories.some((c) => c.parent_id === category.id) : false;
  // Solo categorías principales del mismo tipo pueden ser padre (un nivel).
  const parentOptions = categories.filter((c) => c.parent_id === null && c.kind === kind && c.id !== category?.id);
  const isExpense = kind === "expense";

  const onParentChange = (value: string) => {
    setParentId(value);
    const parent = categories.find((c) => c.id === value);
    if (parent?.bucket) setBucket(parent.bucket);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="kind" value={kind} />

      {!category && (
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={(value) => {
            if (!value) return;
            setKind(value as Kind);
            setParentId(NONE);
          }}
          className="w-full"
        >
          <ToggleGroupItem value="expense" className="h-12 flex-1 text-base data-[state=on]:bg-danger-soft data-[state=on]:text-danger">
            Para gastos
          </ToggleGroupItem>
          <ToggleGroupItem value="income" className="h-12 flex-1 text-base data-[state=on]:bg-success-soft data-[state=on]:text-success">
            Para ingresos
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <Field label="Nombre" htmlFor={`${id}-name`} errors={errors.name}>
        <Input
          id={`${id}-name`}
          name="name"
          required
          maxLength={60}
          autoFocus
          defaultValue={category?.name}
          placeholder={isExpense ? "Ej: Restaurantes" : "Ej: Freelance"}
          aria-invalid={Boolean(errors.name)}
          className={FIELD_CONTROL}
        />
      </Field>

      <Field
        label="¿Va dentro de otra categoría?"
        htmlFor={`${id}-parent`}
        errors={errors.parent_id}
        hint={hasChildren ? "Tiene subcategorías, así que debe seguir siendo principal." : undefined}
      >
        <Select name="parent_id" value={parentId} onValueChange={onParentChange} disabled={hasChildren}>
          <SelectTrigger id={`${id}-parent`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No, es una categoría principal</SelectItem>
            {parentOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Un select deshabilitado no se envía. */}
        {hasChildren && <input type="hidden" name="parent_id" value={NONE} />}
      </Field>

      {isExpense && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tipo de gasto" htmlFor={`${id}-bucket`} errors={errors.bucket}>
            <Select name="bucket" value={bucket} onValueChange={setBucket}>
              <SelectTrigger id={`${id}-bucket`} className={cn("w-full", FIELD_CONTROL)} aria-invalid={Boolean(errors.bucket)}>
                <SelectValue placeholder="Elige…" />
              </SelectTrigger>
              <SelectContent>
                {BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: `var(--${b})` }} aria-hidden />
                    {BUCKET_META[b].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Límite (% de lo que cobras)"
            htmlFor={`${id}-target`}
            errors={errors.target_pct}
            hint="Opcional. Te avisa si te acercas."
          >
            <Input
              id={`${id}-target`}
              name="target_pct"
              type="number"
              inputMode="decimal"
              min="0.5"
              max="100"
              step="0.5"
              defaultValue={category?.target_pct ?? ""}
              placeholder="Ej: 25"
              className={FIELD_CONTROL}
            />
          </Field>
        </div>
      )}

      <FormFooter
        danger={
          category && (
            <ConfirmDelete
              title={`¿Eliminar «${category.name}»?`}
              description={
                hasChildren
                  ? "También se eliminarán sus subcategorías y presupuestos. Si tiene movimientos no se podrá borrar."
                  : "Se eliminarán también sus presupuestos. Si tiene movimientos no se podrá borrar."
              }
              onConfirm={() => deleteCategory(category.id)}
              onDeleted={onDone}
            />
          )
        }
      >
        <SubmitButton pending={pending}>{category ? "Guardar cambios" : "Crear categoría"}</SubmitButton>
      </FormFooter>
    </form>
  );
}
