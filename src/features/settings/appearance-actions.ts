"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { UI_STYLE_COOKIE, UI_STYLES, type UiStyle } from "@/lib/ui-style";

/** Guarda el estilo en una cookie (1 año). Al modificar cookies, Next vuelve a renderizar la página. */
export async function setUiStyle(style: UiStyle): Promise<void> {
  if (!UI_STYLES.includes(style)) return;
  (await cookies()).set(UI_STYLE_COOKIE, style, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  refresh();
}
