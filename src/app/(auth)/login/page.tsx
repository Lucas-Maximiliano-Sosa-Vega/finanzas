import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acceso" };

export default function LoginPage() {
  return (
    // Siempre negra, sea cual sea el tema: `dark` fuerza los tokens oscuros en los inputs.
    <main className="dark fixed inset-0 flex items-center justify-center bg-black px-4 py-[env(safe-area-inset-bottom)] text-foreground [color-scheme:dark]">
      <LoginForm />
    </main>
  );
}
