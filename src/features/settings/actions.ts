"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { formDataToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const generalSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/, { error: "Código ISO de 3 letras" }),
  timezone: z.string().refine(isValidTimeZone, { error: "Zona horaria inválida" }),
});

const pct = z.coerce.number({ error: "Escribe un número" }).min(0, { error: "Mínimo 0" }).max(100, { error: "Máximo 100" });

const ruleSchema = z
  .object({
    needs_pct: pct,
    wants_pct: pct,
    savings_pct: pct,
    alert_threshold_pct: z.coerce.number().int().min(50, { error: "Mínimo 50" }).max(100, { error: "Máximo 100" }),
  })
  .refine((p) => Math.abs(p.needs_pct + p.wants_pct + p.savings_pct - 100) < 0.001, {
    path: ["savings_pct"],
    error: "Los tres porcentajes deben sumar 100",
  });

async function updateProfile(values: TablesUpdate<"profiles">, message: string): Promise<ActionState> {
  const claims = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(values).eq("id", claims.sub);
  if (error) return fromDbError(error);

  refresh();
  return success(message);
}

export async function saveGeneralSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = generalSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  return updateProfile(parsed.data, "Ajustes guardados");
}

export async function saveRuleSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ruleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  return updateProfile(parsed.data, "Reparto actualizado");
}

// 28 (no 31): así el día de cobro siempre existe, en febrero incluido.
const paydaySchema = z.object({
  payday: z.coerce.number({ error: "Elegí un día" }).int().min(1, { error: "Entre 1 y 28" }).max(28, { error: "Entre 1 y 28" }),
});

export async function savePayday(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paydaySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  return updateProfile(parsed.data, "Día de cobro actualizado");
}
