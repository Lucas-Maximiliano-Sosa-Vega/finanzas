"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import {
  failure,
  formDataToObject,
  fromDbError,
  fromZodError,
  optionalId,
  success,
  uuid,
  type ActionState,
} from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const categorySchema = z
  .object({
    id: uuid.optional(),
    name: z.string({ error: "Ponle un nombre" }).min(1).max(60, { error: "Máximo 60 caracteres" }),
    kind: z.enum(["income", "expense"], { error: "Elige el tipo" }),
    parent_id: optionalId,
    bucket: z.enum(["needs", "wants", "savings"]).optional(),
    target_pct: z.coerce
      .number()
      .gt(0, { error: "Debe ser mayor que 0" })
      .max(100, { error: "Máximo 100 %" })
      .optional(),
  })
  .refine((c) => c.kind === "income" || c.bucket || c.parent_id, {
    path: ["bucket"],
    error: "Elige el bloque 50/30/20",
  });

const MESSAGES = { unique: "Ya existe una categoría con ese nombre en ese nivel." };

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = categorySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { id, kind, name, parent_id } = parsed.data;
  const isExpense = kind === "expense";
  // Los ingresos no tienen bloque ni tope; una subcategoría sin bloque hereda el del padre (trigger).
  const values = {
    name,
    parent_id,
    bucket: isExpense ? (parsed.data.bucket ?? null) : null,
    target_pct: isExpense ? (parsed.data.target_pct ?? null) : null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(values).eq("id", id) // el tipo no cambia al editar
    : await supabase.from("categories").insert({ ...values, kind });

  if (error) return fromDbError(error, MESSAGES);

  refresh();
  return success(id ? "Categoría actualizada" : "Categoría creada");
}

export async function deleteCategory(id: string): Promise<ActionState> {
  await requireUser();
  if (!uuid.safeParse(id).success) return failure("Categoría inválida");

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return fromDbError(error, {
      foreignKey: "Tiene movimientos asociados. Cámbialos de categoría o elimínalos antes de borrarla.",
    });
  }

  refresh();
  return success("Categoría eliminada");
}
