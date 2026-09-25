import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/** Cliente para Client Components (singleton gestionado por @supabase/ssr). */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}
