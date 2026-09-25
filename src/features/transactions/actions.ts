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
  success,
  uuid,
  type ActionState,
} from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const transactionSchema = z.object({
  id: uuid.optional(),
  amount: money,
  category_id: z.uuid({ error: "Elige una categoría" }),
  account_id: z.uuid({ error: "Elige una cuenta" }),
  occurred_on: isoDate,
  description: z.string().max(200, { error: "Máximo 200 caracteres" }).optional(),
});

/** Crea o, si viene `id`, actualiza un movimiento. `kind` lo fija un trigger según la categoría. */
export async function saveTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = transactionSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { id, description, ...values } = parsed.data;
  const row = { ...values, description: description ?? null };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id)
    : await supabase.from("transactions").insert(row);

  if (error) return fromDbError(error);

  refresh();
  return success(id ? "Movimiento actualizado" : "Movimiento registrado");
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  await requireUser();
  if (!uuid.safeParse(id).success) return failure("Movimiento inválido");

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return fromDbError(error);

  refresh();
  return success("Movimiento eliminado");
}
