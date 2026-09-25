import { PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { AppearanceSettings } from "@/features/settings/components/appearance-settings";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { getProfile } from "@/features/settings/queries";
import { getUiStyle } from "@/lib/ui-style.server";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [profile, uiStyle] = await Promise.all([getProfile(), getUiStyle()]);

  return (
    <div className="max-w-2xl space-y-10">
      <PageHeader title="Ajustes" description="Apariencia, moneda y zona horaria." />

      <section className="space-y-4" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-xl font-semibold">
          Apariencia
        </h2>
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <AppearanceSettings uiStyle={uiStyle} />
        </div>
        <p className="text-sm text-muted-foreground">Se guarda en este dispositivo.</p>
      </section>

      <section className="space-y-4" aria-labelledby="general-heading">
        <h2 id="general-heading" className="text-xl font-semibold">
          General
        </h2>
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <ProfileForm profile={profile} />
        </div>
      </section>

      <p className="flex flex-wrap items-center gap-1.5 text-base text-muted-foreground">
        ¿Buscas el reparto 50/30/20? Está en el
        <Link href="/#regla" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
          <PencilIcon className="size-4" aria-hidden />
          Resumen
        </Link>
      </p>
    </div>
  );
}
