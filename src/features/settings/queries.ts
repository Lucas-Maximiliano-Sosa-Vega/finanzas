import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth";
import { todayIn } from "@/lib/finance/dates";
import { getPayCycle } from "@/lib/finance/pay-cycle";
import { createClient } from "@/lib/supabase/server";

/** Perfil del usuario (memoizado por petición). */
export const getProfile = cache(async () => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("currency, timezone, payday, needs_pct, wants_pct, savings_pct, alert_threshold_pct")
    .single();
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);

  // PostgREST puede devolver `numeric` como string.
  return {
    ...data,
    needs_pct: Number(data.needs_pct),
    wants_pct: Number(data.wants_pct),
    savings_pct: Number(data.savings_pct),
  };
});

export type Profile = Awaited<ReturnType<typeof getProfile>>;

/** Fecha de hoy y ciclo actual según la zona horaria del perfil. */
export const getCurrentCycle = cache(async () => {
  const profile = await getProfile();
  const today = todayIn(profile.timezone);
  return { today, cycle: getPayCycle(today, profile.payday) };
});
