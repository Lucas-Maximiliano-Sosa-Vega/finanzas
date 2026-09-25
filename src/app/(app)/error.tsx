"use client";

import { RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-lg font-semibold">No se pudo cargar el resumen</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {process.env.NODE_ENV === "development" ? error.message : "Revisa tu conexión e inténtalo de nuevo."}
      </p>
      <Button variant="outline" onClick={retry}>
        <RotateCwIcon />
        Reintentar
      </Button>
    </div>
  );
}
