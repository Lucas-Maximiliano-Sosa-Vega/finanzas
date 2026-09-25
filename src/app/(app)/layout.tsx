import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ClassicHeader } from "@/components/layout/classic-header";
import { MobileMenuButton } from "@/components/layout/mobile-menu-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { QuickAdd, QuickAddFallback } from "@/features/transactions/components/quick-add";
import { getUiStyle } from "@/lib/ui-style.server";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const uiStyle = await getUiStyle();

  const quickAdd = (compact: boolean) => (
    <Suspense fallback={<QuickAddFallback compact={compact} />}>
      <QuickAdd compact={compact} />
    </Suspense>
  );

  // Estilo "Clásico": cabecera con menú horizontal, sin barra lateral.
  if (uiStyle === "classic") {
    return (
      <div className="flex min-h-svh flex-col">
        <ClassicHeader quickAdd={quickAdd(true)} uiStyle={uiStyle} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">{children}</main>
      </div>
    );
  }

  // Estilo "Sencillo": menú lateral grande.
  return (
    <SidebarProvider>
      <AppSidebar quickAdd={quickAdd(false)} uiStyle={uiStyle} />
      <SidebarInset>
        {/* Barra superior solo en móvil: botón de menú bien visible */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <MobileMenuButton>
            <MenuIcon />
            Menú
          </MobileMenuButton>
          <Link href="/" className="text-base font-semibold">
            Finanzas
          </Link>
          {quickAdd(true)}
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 lg:py-12">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
