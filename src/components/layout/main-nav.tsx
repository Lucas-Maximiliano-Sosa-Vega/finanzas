"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/presupuestos", label: "Presupuestos" },
  { href: "/categorias", label: "Categorías" },
  { href: "/cuentas", label: "Cuentas" },
  { href: "/ajustes", label: "Ajustes" },
] as const;

/** Navegación horizontal del estilo "Clásico". */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className={cn("flex items-center gap-1 overflow-x-auto", className)}>
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
