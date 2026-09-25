"use client";

import {
  ArrowLeftRightIcon,
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  HouseIcon,
  LogOutIcon,
  PaletteIcon,
  SettingsIcon,
  TagsIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppearanceMenu } from "@/components/appearance/appearance-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/features/auth/actions";
import type { UiStyle } from "@/lib/ui-style";

const MAIN = [
  { href: "/", label: "Resumen", icon: HouseIcon },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRightIcon },
  { href: "/presupuestos", label: "Presupuestos", icon: TargetIcon },
] as const;

const CONFIG = [
  { href: "/categorias", label: "Categorías", icon: TagsIcon },
  { href: "/cuentas", label: "Cuentas", icon: WalletIcon },
  { href: "/ajustes", label: "Ajustes", icon: SettingsIcon },
] as const;

// Botones grandes y legibles: pensados para usarse sin esfuerzo.
const ITEM = "h-12 gap-3 px-3 text-base [&_svg]:size-5";

export function AppSidebar({ quickAdd, uiStyle }: { quickAdd: React.ReactNode; uiStyle: UiStyle }) {
  return (
    <Sidebar>
      <SidebarHeader className="gap-4 p-4">
        <Link href="/" className="flex items-center gap-2.5 px-1 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <WalletIcon className="size-4" aria-hidden />
          </span>
          Finanzas
        </Link>
        {quickAdd}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label="Mi dinero" items={MAIN} />
        <NavGroup label="Configuración" items={CONFIG} />
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="p-2 pb-4">
        <SidebarMenu className="gap-1">
          <ExportItem />
          <AppearanceItem uiStyle={uiStyle} />
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit" className={ITEM}>
                <LogOutIcon />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<{ href: string; label: string; icon: React.ComponentType }>;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sm">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={`${ITEM} data-[active=true]:bg-info-soft data-[active=true]:font-semibold data-[active=true]:text-primary`}
                >
                  <Link href={href} onClick={() => setOpenMobile(false)} aria-current={active ? "page" : undefined}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ExportItem() {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className={ITEM}>
            <DownloadIcon />
            <span>Descargar mis datos</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          <DropdownMenuItem asChild className="h-11 text-base">
            <a href="/api/export?format=csv" download>
              <FileSpreadsheetIcon />
              Excel / CSV
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="h-11 text-base">
            <a href="/api/export?format=json" download>
              <FileJsonIcon />
              Copia de seguridad (JSON)
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function AppearanceItem({ uiStyle }: { uiStyle: UiStyle }) {
  return (
    <SidebarMenuItem>
      <AppearanceMenu
        uiStyle={uiStyle}
        side="top"
        align="start"
        trigger={
          <SidebarMenuButton className={ITEM}>
            <PaletteIcon />
            <span>Apariencia</span>
          </SidebarMenuButton>
        }
      />
    </SidebarMenuItem>
  );
}
