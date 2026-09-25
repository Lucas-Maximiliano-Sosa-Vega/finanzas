"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "@/features/auth/actions";

const initialState: SignInState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-xs animate-in space-y-6 duration-700 fade-in slide-in-from-bottom-2"
      aria-describedby={state.error ? "login-error" : undefined}
    >
      <div className="space-y-1.5 text-center">
        <div className="mx-auto mb-5 size-2 rounded-full bg-white" aria-hidden />
        <h1 className="text-lg font-medium tracking-tight text-white">Finanzas</h1>
        <p className="text-sm text-neutral-500">Acceso privado</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            defaultValue={state.email}
            required
            autoFocus
            className="h-10 border-neutral-800 bg-neutral-950"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            required
            className="h-10 border-neutral-800 bg-neutral-950"
          />
        </div>
      </div>

      <p id="login-error" role="alert" aria-live="polite" className="min-h-5 text-center text-sm text-red-400">
        {state.error}
      </p>

      <Button type="submit" disabled={pending} className="group h-10 w-full bg-white text-black hover:bg-neutral-200">
        {pending ? (
          <Loader2Icon className="animate-spin" aria-label="Entrando…" />
        ) : (
          <>
            Entrar
            <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
