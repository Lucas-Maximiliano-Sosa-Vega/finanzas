import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const LOGIN_PATH = "/login";

/**
 * Refresca la sesión de Supabase y aplica la redirección optimista:
 * sin sesión → /login, con sesión en /login → /.
 * La autorización real la garantizan RLS y la capa de datos.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // No ejecutar código entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const isLoginRoute = request.nextUrl.pathname === LOGIN_PATH;

  if (isAuthenticated === isLoginRoute) {
    const redirect = NextResponse.redirect(new URL(isAuthenticated ? "/" : LOGIN_PATH, request.url));
    // Conserva las cookies de sesión refrescadas.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
