import "server-only";

import { cookies } from "next/headers";

import { UI_STYLE_COOKIE, parseUiStyle, type UiStyle } from "./ui-style";

export async function getUiStyle(): Promise<UiStyle> {
  return parseUiStyle((await cookies()).get(UI_STYLE_COOKIE)?.value);
}
