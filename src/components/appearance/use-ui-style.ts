"use client";

import { useOptimistic, useTransition } from "react";

import { setUiStyle } from "@/features/settings/appearance-actions";
import type { UiStyle } from "@/lib/ui-style";

/** Cambia el estilo al instante (atributo en <html>) y lo guarda en el servidor. */
export function useUiStyle(current: UiStyle) {
  const [optimistic, setOptimistic] = useOptimistic(current);
  const [pending, startTransition] = useTransition();

  const change = (style: UiStyle) => {
    if (style === optimistic) return;
    startTransition(async () => {
      setOptimistic(style);
      document.documentElement.dataset.style = style;
      await setUiStyle(style);
    });
  };

  return { uiStyle: optimistic, setUiStyle: change, pending };
}
