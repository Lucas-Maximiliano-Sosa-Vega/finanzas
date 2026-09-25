/**
 * Estilo visual de la app, independiente del tema claro/oscuro:
 * - simple:  grande, colorido y con menú lateral (por defecto).
 * - classic: minimalista, compacto, monocromo y con menú superior.
 * Se guarda en una cookie por dispositivo y se aplica como data-style en <html>.
 */
export const UI_STYLES = ["simple", "classic"] as const;
export type UiStyle = (typeof UI_STYLES)[number];

export const UI_STYLE_COOKIE = "ui-style";
export const DEFAULT_UI_STYLE: UiStyle = "simple";

export const UI_STYLE_META: Record<UiStyle, { label: string; description: string }> = {
  simple: { label: "Sencillo", description: "Letra grande, colores y menú lateral" },
  classic: { label: "Clásico", description: "Minimalista, compacto y en blanco y negro" },
};

export function parseUiStyle(value: string | undefined): UiStyle {
  return UI_STYLES.includes(value as UiStyle) ? (value as UiStyle) : DEFAULT_UI_STYLE;
}
