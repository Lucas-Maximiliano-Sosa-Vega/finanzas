"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { toast } from "sonner";

import { IDLE, type ActionState } from "@/lib/actions";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * useActionState + toasts. `onSuccess` se ejecuta tras guardar (p. ej. cerrar el diálogo).
 * Se envía con onSubmit (no con `action`) para que React no vacíe el formulario
 * cuando el servidor devuelve errores de validación.
 */
export function useFormAction(action: FormAction, onSuccess?: () => void) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.status === "success") {
      toast.success(result.message);
      onSuccess?.();
    } else if (result.status === "error" && !result.fieldErrors) {
      toast.error(result.message);
    }
    return result;
  }, IDLE);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return { state, pending, onSubmit, errors: state.fieldErrors ?? {} };
}
