import type { MetadataRoute } from "next";

/**
 * Manifest de instalación (PWA). Genera /manifest.webmanifest.
 * Android/Chrome lo usa para el ícono y el nombre al instalar; iOS ignora
 * estos íconos para "Agregar a inicio" y usa `apple-icon.png` en su lugar
 * (ver layout.tsx → metadata.appleWebApp).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanzas",
    short_name: "Finanzas",
    description: "Panel personal de finanzas: presupuestos, regla 50/30/20 y control de gastos.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2a78d6",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
