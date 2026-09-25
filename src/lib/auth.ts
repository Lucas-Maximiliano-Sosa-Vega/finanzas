import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Claims verificados del JWT (memoizado por petición). */
export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

/** Comprobación en la capa de datos: no confiar solo en proxy.ts. */
export async function requireUser() {
  const claims = await getClaims();
  if (!claims) redirect("/login");
  return claims;
}
