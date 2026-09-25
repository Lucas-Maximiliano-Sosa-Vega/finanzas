"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import {
  failure,
  formDataToObject,
  fromDbError,
  fromZodError,
  isoDate,
  money,
  optionalId,
  success,
  uuid,
  type ActionState,
} from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const budgetSchema = z.object({
  id: uuid.optional(),
  category_id: optionalId,
  amount: money,
  recurring: z.literal("on").optional(),
  cycle_start: isoDate,
});

export async function saveBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = budgetSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { id, category_id, amount, recurring, cycle_start } = parsed.data;
  const values = { category_id, amount, period_start: recurring ? null : cycle_start };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("budgets").update(values).eq("id", id)
    : await supabase.from("budgets").insert(values);

  if (error) {
    return fromDbError(error, {
      unique: recurring
        ? "Ya hay un presupuesto recurrente para esa categoría: edítalo."
        : "Ya hay un presupuesto para esa categoría en este ciclo: edítalo.",
    });
  }

  refresh();
  return success(id ? "Presupuesto actualizado" : "Presupuesto creado");
}

export async function deleteBudget(id: string): Promise<ActionState> {
  await requireUser();
  if (!uuid.safeParse(id).success) return failure("Presupuesto inválido");

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return fromDbError(error);

  refresh();
  return success("Presupuesto eliminado");
}
