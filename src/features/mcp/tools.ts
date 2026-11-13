import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

/** Resultado de una herramienta MCP. */
export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});
const fail = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true });

const createMovementSchema = z.object({
  amount: z.number().positive().max(999_999_999_999),
  category_id: z.uuid(),
  account_id: z.uuid(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD"),
  description: z.string().trim().max(200).optional(),
  allow_duplicate: z.boolean().optional(),
});

const listMovementsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export const TOOLS = [
  {
    name: "listar_cuentas",
    description: "Lista las cuentas activas (efectivo, tarjetas, bancos). Devuelve id, nombre y tipo.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "listar_categorias",
    description:
      "Lista las categorías y subcategorías (id, nombre, tipo income/expense, bloque 50/30/20, parent_id). " +
      "Úsalo antes de crear un movimiento para elegir category_id.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "listar_movimientos_recientes",
    description: "Últimos movimientos registrados, para revisar duplicados.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50, description: "Por defecto 10" } },
      additionalProperties: false,
    },
  },
  {
    name: "crear_movimiento",
    description:
      "Registra un movimiento (gasto o ingreso; el tipo lo define la categoría). " +
      "El importe es siempre positivo. Si ya existe uno igual (misma cuenta, importe, fecha y descripción) " +
      "no lo crea, salvo que allow_duplicate sea true.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Importe positivo, p. ej. 45.90" },
        category_id: { type: "string", description: "UUID de listar_categorias" },
        account_id: { type: "string", description: "UUID de listar_cuentas" },
        occurred_on: { type: "string", description: "Fecha AAAA-MM-DD" },
        description: { type: "string", description: "Comercio o detalle, máx. 200 caracteres" },
        allow_duplicate: { type: "boolean", description: "Crear aunque parezca duplicado" },
      },
      required: ["amount", "category_id", "account_id", "occurred_on"],
      additionalProperties: false,
    },
  },
] as const;

/** Ejecuta una herramienta en nombre de `userId` (el único usuario de la app). */
export async function callTool(name: string, args: unknown, userId: string): Promise<ToolResult> {
  const db = createAdminClient();

  switch (name) {
    case "listar_cuentas": {
      const { data, error } = await db
        .from("accounts")
        .select("id, name, type")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("name");
      return error ? fail("No se pudieron leer las cuentas.") : ok(data);
    }

    case "listar_categorias": {
      const { data, error } = await db
        .from("categories")
        .select("id, name, kind, bucket, parent_id")
        .eq("user_id", userId)
        .order("kind")
        .order("name");
      return error ? fail("No se pudieron leer las categorías.") : ok(data);
    }

    case "listar_movimientos_recientes": {
      const parsed = listMovementsSchema.safeParse(args ?? {});
      if (!parsed.success) return fail("Argumentos inválidos.");
      const { data, error } = await db
        .from("transactions")
        .select("id, kind, amount, occurred_on, description, account_id, category_id")
        .eq("user_id", userId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(parsed.data.limit ?? 10);
      return error ? fail("No se pudieron leer los movimientos.") : ok(data);
    }

    case "crear_movimiento": {
      const parsed = createMovementSchema.safeParse(args);
      if (!parsed.success) return fail(`Argumentos inválidos: ${z.prettifyError(parsed.error)}`);
      const { allow_duplicate, description, ...values } = parsed.data;
      const amount = Math.round(values.amount * 100) / 100;

      if (!allow_duplicate) {
        let query = db
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("account_id", values.account_id)
          .eq("amount", amount)
          .eq("occurred_on", values.occurred_on);
        query = description ? query.eq("description", description) : query.is("description", null);
        const { data: existing } = await query.limit(1);
        if (existing && existing.length > 0) {
          return fail(
            "Ya existe un movimiento igual (misma cuenta, importe, fecha y descripción). " +
              "Si es otro distinto, vuelve a llamar con allow_duplicate: true.",
          );
        }
      }

      // user_id explícito: con la clave de servicio no hay auth.uid() para el default.
      // Los triggers validan que cuenta y categoría pertenezcan a ese usuario.
      const { data, error } = await db
        .from("transactions")
        .insert({ ...values, amount, description: description ?? null, user_id: userId })
        .select("id, kind, amount, occurred_on, description")
        .single();

      if (error) return fail(error.code === "P0001" ? error.message : "No se pudo guardar el movimiento.");
      return ok({ creado: data });
    }

    default:
      return fail(`Herramienta desconocida: ${name}`);
  }
}
