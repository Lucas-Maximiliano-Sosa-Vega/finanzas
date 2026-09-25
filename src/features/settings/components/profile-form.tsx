"use client";

import { useId, useMemo } from "react";

import { FIELD_CONTROL, Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormAction } from "@/hooks/use-form-action";
import { cn } from "@/lib/utils";

import { saveGeneralSettings } from "../actions";

const CURRENCIES = [
  ["PYG", "Guaraní paraguayo"],
  ["USD", "Dólar estadounidense"],
  ["EUR", "Euro"],
  ["ARS", "Peso argentino"],
  ["BRL", "Real brasileño"],
  ["UYU", "Peso uruguayo"],
  ["CLP", "Peso chileno"],
  ["BOB", "Boliviano"],
  ["PEN", "Sol peruano"],
  ["COP", "Peso colombiano"],
  ["MXN", "Peso mexicano"],
] as const;

interface ProfileFormProps {
  profile: { currency: string; timezone: string; payday: number };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const { onSubmit, pending, errors } = useFormAction(saveGeneralSettings);
  const id = useId();
  const timezones = useMemo(() => [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")])], []);
  const currencies = CURRENCIES.some(([code]) => code === profile.currency)
    ? CURRENCIES
    : [[profile.currency, profile.currency] as const, ...CURRENCIES];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label="Moneda" htmlFor={`${id}-currency`} errors={errors.currency} hint="Cómo se muestran los importes.">
        <Select name="currency" defaultValue={profile.currency}>
          <SelectTrigger id={`${id}-currency`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map(([code, name]) => (
              <SelectItem key={code} value={code} className="h-10 text-base">
                <span className="font-medium">{code}</span>
                <span className="text-muted-foreground">{name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Zona horaria" htmlFor={`${id}-timezone`} errors={errors.timezone} hint="Sirve para saber qué día es hoy.">
        <Select name="timezone" defaultValue={profile.timezone}>
          <SelectTrigger id={`${id}-timezone`} className={cn("w-full", FIELD_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz} className="text-base">
                {tz.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex justify-end border-t pt-5">
        <SubmitButton pending={pending}>Guardar ajustes</SubmitButton>
      </div>
    </form>
  );
}
