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

const transferSchema = z
  .object({
    from_account_id: z.uuid({ error: "Elige la cuenta de origen" }),
    to_account_id: z.uuid({ error: "Elige la cuenta de destino" }),
    amount: money,
    occurred_on: isoDate,
    description: z.string().max(200, { error: "Máximo 200 caracteres" }).optional(),
  })
  .refine((t) => t.from_account_id !== t.to_account_id, {
    path: ["to_account_id"],
    error: "Elige una cuenta distinta a la de origen",
  });

/** Mueve dinero entre dos cuentas. No cuenta como gasto ni ingreso. */
export async function saveTransfer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = transferSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { description, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("transfers").insert({ ...values, description: description ?? null });
  if (error) {
    return error.code === "42P01" || error.code === "PGRST205"
      ? failure("Falta aplicar la migración de transferencias en Supabase.")
      : fromDbError(error);
  }

  refresh();
  return success("Transferencia registrada");
}

export async function deleteTransfer(id: string): Promise<ActionState> {
  await requireUser();
  if (!uuid.safeParse(id).success) return failure("Transferencia inválida");

  const supabase = await createClient();
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  if (error) return fromDbError(error);

  refresh();
  return success("Transferencia eliminada");
}
