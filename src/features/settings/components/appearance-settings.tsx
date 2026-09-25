"use client";

import { CheckIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { STYLE_ICONS, THEMES } from "@/components/appearance/appearance-menu";
import { useUiStyle } from "@/components/appearance/use-ui-style";
import { UI_STYLE_META, UI_STYLES, type UiStyle } from "@/lib/ui-style";
import { cn } from "@/lib/utils";

// El tema solo se conoce en el cliente: evita desajustes de hidratación.
const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export function AppearanceSettings({ uiStyle }: { uiStyle: UiStyle }) {
  const style = useUiStyle(uiStyle);
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <div className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="mb-3 text-base font-semibold">Estilo</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {UI_STYLES.map((value) => {
            const Icon = STYLE_ICONS[value];
            const selected = style.uiStyle === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                disabled={style.pending}
                onClick={() => style.setUiStyle(value)}
                className={cn(
                  "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected ? "border-primary bg-info-soft" : "border-border hover:bg-muted/60",
                )}
              >
                <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
                <span className="space-y-0.5">
                  <span className="block text-base font-semibold">{UI_STYLE_META[value].label}</span>
                  <span className="block text-sm text-muted-foreground">{UI_STYLE_META[value].description}</span>
                </span>
                {selected && <CheckIcon className="absolute top-3 right-3 size-5 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-base font-semibold">Tema</legend>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const selected = hydrated && theme === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected ? "border-primary bg-info-soft" : "border-border hover:bg-muted/60",
                )}
              >
                <Icon className="size-6" aria-hidden />
                <span className="text-base font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
