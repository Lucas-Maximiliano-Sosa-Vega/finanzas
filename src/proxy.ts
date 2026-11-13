import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo excepto /api/mcp (se autentica con su propia clave, sin sesión de usuario),
  // assets estáticos, imágenes optimizadas y el manifest de la PWA
  // (Chrome debe poder leerlo sin sesión para ofrecer instalar la app).
  matcher: ["/((?!api/mcp|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
