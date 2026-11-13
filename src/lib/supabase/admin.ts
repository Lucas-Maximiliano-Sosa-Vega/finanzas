import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con la clave de servicio: se salta RLS. Úsalo SOLO en el servidor y
 * solo en rutas que ya hayan autenticado la petición (p. ej. /api/mcp).
 * Al saltarse RLS, toda consulta debe filtrar por `user_id` a mano.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.");

  return createClient<Database>(env.supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
