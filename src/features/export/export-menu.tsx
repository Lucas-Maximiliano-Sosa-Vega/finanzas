import { DownloadIcon, FileJsonIcon, FileSpreadsheetIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Botón compacto de exportación (cabecera del estilo "Clásico"). */
export function ExportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Descargar mis datos">
          <DownloadIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Descargar mis datos</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href="/api/export?format=csv" download>
            <FileSpreadsheetIcon />
            Excel / CSV
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/api/export?format=json" download>
            <FileJsonIcon />
            Copia de seguridad (JSON)
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
