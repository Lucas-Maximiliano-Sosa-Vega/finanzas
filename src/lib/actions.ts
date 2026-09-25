import { z } from "zod";

/** Resultado común de todas las Server Actions de formularios. */
export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export const IDLE: ActionState = { status: "idle" };

export const success = (message: string): ActionState => ({ status: "success", message });
export const failure = (message: string): ActionState => ({ status: "error", message });

export function fromZodError(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

interface DbError {
  code?: string;
  message: string;
}

/** Traduce errores de Postgres/PostgREST a mensajes útiles. */
export function fromDbError(error: DbError, messages: { unique?: string; foreignKey?: string } = {}): ActionState {
  switch (error.code) {
    case "23505":
      return failure(messages.unique ?? "Ya existe un registro con esos datos.");
    case "23503":
      return failure(messages.foreignKey ?? "Está en uso por otros registros.");
    case "P0001": // raise exception de nuestros triggers (mensajes ya en español)
      return failure(error.message);
    case "23514":
      return failure("Algún valor no es válido.");
    default:
      return failure("No se pudo guardar. Inténtalo de nuevo.");
  }
}

/** Convierte FormData en objeto; los campos vacíos pasan a undefined. */
export function formDataToObject(formData: FormData): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of formData) {
    if (key.startsWith("$ACTION")) continue;
    const text = typeof value === "string" ? value.trim() : undefined;
    result[key] = text === "" ? undefined : text;
  }
  return result;
}

/* Esquemas reutilizables ---------------------------------------------------- */

export const uuid = z.uuid({ error: "Identificador inválido" });

export const money = z.coerce
  .number({ error: "Introduce un importe" })
  .positive({ error: "Debe ser mayor que 0" })
  .max(999_999_999_999, { error: "Importe demasiado grande" })
  .transform((n) => Math.round(n * 100) / 100);

export const isoDate = z.iso.date({ error: "Fecha inválida" });

/** Select con opción "ninguno" (Radix no admite value=""). */
export const NONE = "none";
export const optionalId = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === NONE ? null : v))
  .pipe(uuid.nullable());
