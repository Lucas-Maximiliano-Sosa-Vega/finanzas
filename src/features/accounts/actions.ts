"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { failure, formDataToObject, fromDbError, fromZodError, success, uuid, type ActionState } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { ACCOUNT_TYPE_VALUES } from "./labels";

const accountSchema = z.object({
  id: uuid.optional(),
  name: z.string({ error: "Ponle un nombre" }).min(1).max(60, { error: "Máximo 60 caracteres" }),
  type: z.enum(ACCOUNT_TYPE_VALUES, { error: "Elige el tipo" }),
  // Puede ser negativo (p. ej. deuda inicial de una tarjeta).
  initial_balance: z.coerce
    .number({ error: "Importe inválido" })
    .default(0)
    .transform((n) => Math.round(n * 100) / 100),
});

const MESSAGES = { unique: "Ya tienes una cuenta con ese nombre." };

export async function saveAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = accountSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("accounts").update(values).eq("id", id)
    : await supabase.from("accounts").insert(values);

  if (error) return fromDbError(error, MESSAGES);

  refresh();
  return success(id ? "Cuenta actualizada" : "Cuenta creada");
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionState> {
  await requireUser();
  if (!uuid.safeParse(id).success) return failure("Cuenta inválida");

  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_archived: archived }).eq("id", id);
  if (error) return fromDbError(error);

  refresh();
  return success(archived ? "Cuenta archivada" : "Cuenta reactivada");
}

export async function deleteAccount(id: string): Promise<ActionState> {
  await requireUser();
  if (!uuid.safeParse(id).success) return failure("Cuenta inválida");

  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) {
    return fromDbError(error, {
      foreignKey: "Tiene movimientos asociados. Archívala para ocultarla sin perder el historial.",
    });
  }

  refresh();
  return success("Cuenta eliminada");
}
