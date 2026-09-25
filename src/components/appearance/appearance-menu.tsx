"use client";

import { LaptopIcon, LayoutListIcon, MoonIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UI_STYLE_META, type UiStyle } from "@/lib/ui-style";

import { useUiStyle } from "./use-ui-style";

export const THEMES = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Oscuro", icon: MoonIcon },
  { value: "system", label: "Automático", icon: LaptopIcon },
] as const;

export const STYLE_ICONS = { simple: SparklesIcon, classic: LayoutListIcon } as const;

interface AppearanceMenuProps {
  uiStyle: UiStyle;
  trigger: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

/** Menú de apariencia: estilo (Sencillo/Clásico) y tema (claro/oscuro). */
export function AppearanceMenu({ uiStyle, trigger, side = "bottom", align = "end" }: AppearanceMenuProps) {
  const { theme, setTheme } = useTheme();
  const style = useUiStyle(uiStyle);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="min-w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Estilo</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={style.uiStyle} onValueChange={(value) => style.setUiStyle(value as UiStyle)}>
          {(Object.keys(UI_STYLE_META) as UiStyle[]).map((value) => {
            const Icon = STYLE_ICONS[value];
            return (
              <DropdownMenuRadioItem key={value} value={value} className="py-2">
                <Icon />
                <span className="flex flex-col">
                  <span className="font-medium">{UI_STYLE_META[value].label}</span>
                  <span className="text-xs text-muted-foreground">{UI_STYLE_META[value].description}</span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
