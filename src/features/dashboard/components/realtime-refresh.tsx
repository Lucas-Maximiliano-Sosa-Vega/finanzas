"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

const WATCHED_TABLES = ["transactions", "budgets", "categories"] as const;

/**
 * Re-renderiza los Server Components cuando cambian los datos (desde otra
 * pestaña, el móvil o el propio Supabase), manteniendo las alertas al día.
 */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Agrupa ráfagas de cambios (importaciones, borrados masivos) en un solo refresh.
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase.channel("dashboard-changes");
    for (const table of WATCHED_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
