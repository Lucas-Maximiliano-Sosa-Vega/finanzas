import { LogOutIcon, PaletteIcon } from "lucide-react";
import Link from "next/link";

import { AppearanceMenu } from "@/components/appearance/appearance-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut } from "@/features/auth/actions";
import { ExportMenu } from "@/features/export/export-menu";
import type { UiStyle } from "@/lib/ui-style";

import { MainNav } from "./main-nav";

/** Cabecera del estilo "Clásico": marca, navegación horizontal y acciones compactas. */
export function ClassicHeader({ quickAdd, uiStyle }: { quickAdd: React.ReactNode; uiStyle: UiStyle }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-medium tracking-tight">
            <span className="size-2 rounded-full bg-foreground" aria-hidden />
            Finanzas
          </Link>
          <MainNav className="hidden lg:flex" />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {quickAdd}
          <ExportMenu />
          <AppearanceMenu
            uiStyle={uiStyle}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Apariencia">
                <PaletteIcon />
              </Button>
            }
          />
          <form action={signOut}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
                  <LogOutIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cerrar sesión</TooltipContent>
            </Tooltip>
          </form>
        </div>
      </div>
      {/* Móvil y tablet: navegación desplazable bajo la cabecera */}
      <div className="border-t px-2 py-1.5 lg:hidden">
        <MainNav className="mx-auto max-w-6xl" />
      </div>
    </header>
  );
}
