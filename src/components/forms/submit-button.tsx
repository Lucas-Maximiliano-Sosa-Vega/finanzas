import { CheckIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="h-12 w-full px-6 text-base sm:w-auto">
      {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
      {children}
    </Button>
  );
}

/** Pie de formulario: "Eliminar" a la izquierda (si aplica) y guardar a la derecha. */
export function FormFooter({ danger, children }: { danger?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div>{danger}</div>
      {children}
    </div>
  );
}
