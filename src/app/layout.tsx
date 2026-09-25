import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getUiStyle } from "@/lib/ui-style.server";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Finanzas", template: "%s · Finanzas" },
  description: "Panel personal de finanzas",
  robots: { index: false, follow: false },
  // "Agregar a inicio" en iOS: usa apple-icon.png y este título; el manifest
  // (para Android/Chrome) se detecta solo desde app/manifest.ts.
  appleWebApp: { title: "Finanzas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Que el fondo llegue hasta los bordes en iPhones con notch/isla dinámica.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // El estilo se lee de la cookie en el servidor: se aplica sin parpadeo al cargar.
  const uiStyle = await getUiStyle();

  return (
    // suppressHydrationWarning: next-themes añade la clase del tema antes de hidratar.
    <html
      lang="es"
      data-style={uiStyle}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-svh antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
