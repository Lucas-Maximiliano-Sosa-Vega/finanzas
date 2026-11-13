import "server-only";

import { z } from "zod";

import { ACCOUNT_TYPE_VALUES } from "@/features/accounts/labels";
import { todayIn } from "@/lib/finance/dates";
import { getPayCycle } from "@/lib/finance/pay-cycle";
import { BUCKETS, evaluateBucket, type CycleTotals, type RuleTargets } from "@/lib/finance/rule";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/types/database";

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

type Db = ReturnType<typeof createAdminClient>;
interface Ctx {
  db: Db;
  userId: string;
}

/** Mensaje útil: los `raise exception` de los triggers (P0001) ya vienen en español. */
function dbFail(error: { code?: string; message: string }, fallback: string): ToolResult {
  switch (error.code) {
    case "P0001":
      return fail(error.message);
    case "23505":
      return fail("Ya existe un registro con esos datos.");
    case "23503":
      return fail("Está en uso por otros registros.");
    case "23514":
      return fail("Algún valor no es válido.");
    default:
      return fail(fallback);
  }
}

/* -------------------------------------------------------------------------- */
/* Esquemas                                                                   */
/* -------------------------------------------------------------------------- */

const uuid = z.uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD");
const amount = z.number().positive().max(999_999_999_999);
const round2 = (n: number) => Math.round(n * 100) / 100;

const bucketEnum = z.enum(BUCKETS);

/* -------------------------------------------------------------------------- */
/* Utilidades de lectura                                                      */
/* -------------------------------------------------------------------------- */

async function getProfile({ db, userId }: Ctx) {
  const { data } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

/** Lee todas las filas paginando (PostgREST limita a 1000 por consulta). */
async function fetchAllTransactions({ db, userId }: Ctx, from?: string, to?: string) {
  const rows: { account_id: string; category_id: string; kind: "income" | "expense"; amount: number }[] = [];
  for (let start = 0; ; start += 1000) {
    let query = db
      .from("transactions")
      .select("account_id, category_id, kind, amount")
      .eq("user_id", userId)
      .order("created_at")
      .range(start, start + 999);
    if (from) query = query.gte("occurred_on", from);
    if (to) query = query.lte("occurred_on", to);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

/* -------------------------------------------------------------------------- */
/* Herramientas                                                               */
/* -------------------------------------------------------------------------- */

interface Tool<S extends z.ZodType> {
  name: string;
  description: string;
  schema: S;
  /** Solo lectura / destructiva / idempotente: ayuda a Claude a pedir confirmación. */
  hints: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  run: (args: z.output<S>, ctx: Ctx) => Promise<ToolResult>;
}

const tool = <S extends z.ZodType>(t: Tool<S>) => t;
const noArgs = z.object({}).strict();

const movementFields = {
  amount: amount.describe("Importe positivo, p. ej. 45.90"),
  category_id: uuid.describe("UUID de listar_categorias"),
  account_id: uuid.describe("UUID de listar_cuentas"),
  occurred_on: isoDate.describe("Fecha AAAA-MM-DD"),
  description: z.string().trim().max(200).describe("Comercio o detalle, máx. 200 caracteres"),
};

const allTools = [
  /* --- Lectura ------------------------------------------------------------ */
  tool({
    name: "listar_cuentas",
    description: "Lista las cuentas con su tipo, saldo inicial, saldo actual y si están archivadas.",
    schema: z.object({ incluir_archivadas: z.boolean().optional() }),
    hints: { readOnlyHint: true },
    async run({ incluir_archivadas }, ctx) {
      let query = ctx.db
        .from("accounts")
        .select("id, name, type, initial_balance, is_archived")
        .eq("user_id", ctx.userId)
        .order("name");
      if (!incluir_archivadas) query = query.eq("is_archived", false);
      const { data: accounts, error } = await query;
      if (error) return fail("No se pudieron leer las cuentas.");

      const delta = new Map<string, number>();
      for (const t of await fetchAllTransactions(ctx)) {
        delta.set(t.account_id, (delta.get(t.account_id) ?? 0) + (t.kind === "income" ? t.amount : -t.amount));
      }
      return ok(
        accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          archived: a.is_archived,
          initial_balance: a.initial_balance,
          balance: round2(a.initial_balance + (delta.get(a.id) ?? 0)),
        })),
      );
    },
  }),

  tool({
    name: "listar_categorias",
    description:
      "Lista categorías y subcategorías (id, nombre, tipo income/expense, bloque 50/30/20, tope target_pct, parent_id). " +
      "Úsalo antes de crear un movimiento para elegir category_id.",
    schema: noArgs,
    hints: { readOnlyHint: true },
    async run(_args, { db, userId }) {
      const { data, error } = await db
        .from("categories")
        .select("id, name, kind, bucket, target_pct, parent_id")
        .eq("user_id", userId)
        .order("kind")
        .order("name");
      return error ? fail("No se pudieron leer las categorías.") : ok(data);
    },
  }),

  tool({
    name: "listar_movimientos_recientes",
    description: "Últimos movimientos (con id, para poder editarlos o borrarlos). Sirve también para revisar duplicados.",
    schema: z.object({
      limit: z.number().int().min(1).max(50).optional().describe("Por defecto 10"),
      desde: isoDate.optional().describe("Solo movimientos desde esta fecha"),
      hasta: isoDate.optional().describe("Solo movimientos hasta esta fecha"),
      category_id: uuid.optional(),
      account_id: uuid.optional(),
    }),
    hints: { readOnlyHint: true },
    async run({ limit, desde, hasta, category_id, account_id }, { db, userId }) {
      let query = db
        .from("transactions")
        .select("id, kind, amount, occurred_on, description, account_id, category_id")
        .eq("user_id", userId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit ?? 10);
      if (desde) query = query.gte("occurred_on", desde);
      if (hasta) query = query.lte("occurred_on", hasta);
      if (category_id) query = query.eq("category_id", category_id);
      if (account_id) query = query.eq("account_id", account_id);
      const { data, error } = await query;
      return error ? fail("No se pudieron leer los movimientos.") : ok(data);
    },
  }),

  tool({
    name: "resumen_ciclo",
    description:
      "Resumen del ciclo de cobro (el 'mes' financiero): ingresos, gasto por bloque 50/30/20 frente a su límite, " +
      "estado (ok/warning/exceeded/achieved) y gasto por categoría. Sin fecha usa el ciclo actual.",
    schema: z.object({ fecha: isoDate.optional().describe("Cualquier fecha dentro del ciclo que se quiere ver") }),
    hints: { readOnlyHint: true },
    async run({ fecha }, ctx) {
      const profile = await getProfile(ctx);
      if (!profile) return fail("No se encontró el perfil del usuario.");

      const today = todayIn(profile.timezone);
      const cycle = getPayCycle(fecha ?? today, profile.payday);

      const [rows, { data: categories }] = await Promise.all([
        fetchAllTransactions(ctx, cycle.start, cycle.end),
        ctx.db.from("categories").select("id, name, bucket, parent_id").eq("user_id", ctx.userId),
      ]);
      const byId = new Map((categories ?? []).map((c) => [c.id, c]));

      const totals: CycleTotals = { income: 0, needs: 0, wants: 0, savings: 0 };
      const perCategory = new Map<string, number>();
      for (const t of rows) {
        if (t.kind === "income") {
          totals.income += t.amount;
          continue;
        }
        const category = byId.get(t.category_id);
        if (category?.bucket) totals[category.bucket] += t.amount;
        const parent = category?.parent_id ? byId.get(category.parent_id) : undefined;
        const label = parent ? `${parent.name} › ${category?.name}` : (category?.name ?? "?");
        perCategory.set(label, (perCategory.get(label) ?? 0) + t.amount);
      }

      const targets: RuleTargets = {
        needs: profile.needs_pct,
        wants: profile.wants_pct,
        savings: profile.savings_pct,
      };
      return ok({
        ciclo: { desde: cycle.start, hasta: cycle.end, hoy: today, dias_para_cobrar: cycle.daysUntilPayday },
        moneda: profile.currency,
        ingresos: round2(totals.income),
        gasto_total: round2(totals.needs + totals.wants),
        bloques: BUCKETS.map((b) => {
          const s = evaluateBucket(b, totals, targets, profile.alert_threshold_pct);
          return {
            bloque: b,
            gastado: round2(s.spent),
            limite: round2(s.limit),
            objetivo_pct: s.targetPct,
            real_pct: s.actualPct === null ? null : round2(s.actualPct),
            estado: s.level,
          };
        }),
        gasto_por_categoria: [...perCategory]
          .map(([categoria, gastado]) => ({ categoria, gastado: round2(gastado) }))
          .sort((a, b) => b.gastado - a.gastado),
      });
    },
  }),

  /* --- Movimientos -------------------------------------------------------- */
  tool({
    name: "crear_movimiento",
    description:
      "Registra un movimiento (gasto o ingreso; el tipo lo define la categoría). El importe es siempre positivo. " +
      "Si ya existe uno igual (misma cuenta, importe, fecha y descripción) no lo crea, salvo que allow_duplicate sea true.",
    schema: z.object({
      ...movementFields,
      description: movementFields.description.optional(),
      allow_duplicate: z.boolean().optional().describe("Crear aunque parezca duplicado"),
    }),
    hints: {},
    async run({ allow_duplicate, description, ...values }, { db, userId }) {
      const value = round2(values.amount);

      if (!allow_duplicate) {
        let query = db
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("account_id", values.account_id)
          .eq("amount", value)
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
        .insert({ ...values, amount: value, description: description ?? null, user_id: userId })
        .select("id, kind, amount, occurred_on, description")
        .single();
      return error ? dbFail(error, "No se pudo guardar el movimiento.") : ok({ creado: data });
    },
  }),

  tool({
    name: "actualizar_movimiento",
    description: "Corrige un movimiento existente (id de listar_movimientos_recientes). Solo cambia los campos indicados.",
    schema: z.object({
      id: uuid,
      amount: movementFields.amount.optional(),
      category_id: movementFields.category_id.optional(),
      account_id: movementFields.account_id.optional(),
      occurred_on: movementFields.occurred_on.optional(),
      description: movementFields.description.nullable().optional().describe("null para borrar la descripción"),
    }),
    hints: { idempotentHint: true },
    async run({ id, ...changes }, { db, userId }) {
      const values: TablesUpdate<"transactions"> = Object.fromEntries(
        Object.entries(changes).filter(([, v]) => v !== undefined),
      );
      if (values.amount !== undefined) values.amount = round2(values.amount);
      if (Object.keys(values).length === 0) return fail("No indicaste ningún campo para cambiar.");

      const { data, error } = await db
        .from("transactions")
        .update(values)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, kind, amount, occurred_on, description, account_id, category_id");
      if (error) return dbFail(error, "No se pudo actualizar el movimiento.");
      return data.length === 0 ? fail("No existe ese movimiento.") : ok({ actualizado: data[0] });
    },
  }),

  tool({
    name: "eliminar_movimiento",
    description: "Elimina un movimiento de forma permanente. Confirma con el usuario antes de llamarlo.",
    schema: z.object({ id: uuid }),
    hints: { destructiveHint: true, idempotentHint: true },
    async run({ id }, { db, userId }) {
      const { data, error } = await db
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, amount, occurred_on, description");
      if (error) return dbFail(error, "No se pudo eliminar el movimiento.");
      return data.length === 0 ? fail("No existe ese movimiento.") : ok({ eliminado: data[0] });
    },
  }),

  /* --- Cuentas ------------------------------------------------------------ */
  tool({
    name: "guardar_cuenta",
    description:
      "Crea una cuenta, o la edita si se indica id. Para archivar/reactivar usa archivada. " +
      "El saldo inicial puede ser negativo (deuda previa de una tarjeta).",
    schema: z.object({
      id: uuid.optional().describe("Omitir para crear"),
      name: z.string().trim().min(1).max(60).optional(),
      type: z.enum(ACCOUNT_TYPE_VALUES).optional(),
      initial_balance: z.number().optional(),
      archivada: z.boolean().optional(),
    }),
    hints: { idempotentHint: true },
    async run({ id, name, type, initial_balance, archivada }, { db, userId }) {
      const values = {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(initial_balance !== undefined && { initial_balance: round2(initial_balance) }),
        ...(archivada !== undefined && { is_archived: archivada }),
      };

      if (!id) {
        if (!name || !type) return fail("Para crear una cuenta hacen falta name y type.");
        const { data, error } = await db
          .from("accounts")
          .insert({ ...values, name, type, user_id: userId })
          .select("id, name, type, initial_balance")
          .single();
        return error ? dbFail(error, "No se pudo crear la cuenta.") : ok({ creada: data });
      }

      if (Object.keys(values).length === 0) return fail("No indicaste ningún campo para cambiar.");
      const { data, error } = await db
        .from("accounts")
        .update(values)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, name, type, initial_balance, is_archived");
      if (error) return dbFail(error, "No se pudo actualizar la cuenta.");
      return data.length === 0 ? fail("No existe esa cuenta.") : ok({ actualizada: data[0] });
    },
  }),

  /* --- Categorías --------------------------------------------------------- */
  tool({
    name: "guardar_categoria",
    description:
      "Crea una categoría/subcategoría, o la edita si se indica id (el tipo no se puede cambiar). " +
      "Los gastos necesitan bloque (needs=esenciales, wants=flexibles, savings=ahorro) salvo que sean subcategoría, " +
      "que hereda el del padre. target_pct es un tope opcional como % de los ingresos del ciclo; null lo quita.",
    schema: z.object({
      id: uuid.optional().describe("Omitir para crear"),
      name: z.string().trim().min(1).max(60).optional(),
      kind: z.enum(["income", "expense"]).optional().describe("Obligatorio al crear"),
      parent_id: uuid.nullable().optional().describe("Categoría padre (solo un nivel)"),
      bucket: bucketEnum.optional(),
      target_pct: z.number().gt(0).max(100).nullable().optional(),
    }),
    hints: { idempotentHint: true },
    async run({ id, name, kind, parent_id, bucket, target_pct }, { db, userId }) {
      if (!id) {
        if (!name || !kind) return fail("Para crear una categoría hacen falta name y kind.");
        if (kind === "expense" && !bucket && !parent_id) return fail("Los gastos necesitan bloque (bucket).");
        const { data, error } = await db
          .from("categories")
          .insert({
            user_id: userId,
            name,
            kind,
            parent_id: parent_id ?? null,
            bucket: kind === "expense" ? (bucket ?? null) : null,
            target_pct: kind === "expense" ? (target_pct ?? null) : null,
          })
          .select("id, name, kind, bucket, target_pct, parent_id")
          .single();
        return error ? dbFail(error, "No se pudo crear la categoría.") : ok({ creada: data });
      }

      const values = {
        ...(name !== undefined && { name }),
        ...(parent_id !== undefined && { parent_id }),
        ...(bucket !== undefined && { bucket }),
        ...(target_pct !== undefined && { target_pct }),
      };
      if (Object.keys(values).length === 0) return fail("No indicaste ningún campo para cambiar.");
      const { data, error } = await db
        .from("categories")
        .update(values)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, name, kind, bucket, target_pct, parent_id");
      if (error) return dbFail(error, "No se pudo actualizar la categoría.");
      return data.length === 0 ? fail("No existe esa categoría.") : ok({ actualizada: data[0] });
    },
  }),

  /* --- Presupuestos ------------------------------------------------------- */
  tool({
    name: "listar_presupuestos",
    description: "Lista los presupuestos. category_id null = presupuesto global; period_start null = recurrente.",
    schema: noArgs,
    hints: { readOnlyHint: true },
    async run(_args, { db, userId }) {
      const { data, error } = await db
        .from("budgets")
        .select("id, category_id, period_start, amount")
        .eq("user_id", userId)
        .order("created_at");
      return error ? fail("No se pudieron leer los presupuestos.") : ok(data);
    },
  }),

  tool({
    name: "guardar_presupuesto",
    description:
      "Crea un presupuesto, o cambia su importe si se indica id. category_id omitido = presupuesto global de gasto. " +
      "recurrente=true (por defecto) aplica a todos los ciclos; false lo limita al ciclo actual.",
    schema: z.object({
      id: uuid.optional(),
      category_id: uuid.nullable().optional().describe("Solo categorías de gasto"),
      amount: amount,
      recurrente: z.boolean().optional(),
    }),
    hints: { idempotentHint: true },
    async run({ id, category_id, amount: value, recurrente }, ctx) {
      const { db, userId } = ctx;
      if (id) {
        const { data, error } = await db
          .from("budgets")
          .update({ amount: round2(value) })
          .eq("id", id)
          .eq("user_id", userId)
          .select("id, category_id, period_start, amount");
        if (error) return dbFail(error, "No se pudo actualizar el presupuesto.");
        return data.length === 0 ? fail("No existe ese presupuesto.") : ok({ actualizado: data[0] });
      }

      let periodStart: string | null = null;
      if (recurrente === false) {
        const profile = await getProfile(ctx);
        if (!profile) return fail("No se encontró el perfil del usuario.");
        periodStart = getPayCycle(todayIn(profile.timezone), profile.payday).start;
      }
      const { data, error } = await db
        .from("budgets")
        .insert({ user_id: userId, category_id: category_id ?? null, amount: round2(value), period_start: periodStart })
        .select("id, category_id, period_start, amount")
        .single();
      return error ? dbFail(error, "No se pudo crear el presupuesto.") : ok({ creado: data });
    },
  }),

  tool({
    name: "eliminar_presupuesto",
    description: "Elimina un presupuesto de forma permanente. Confirma con el usuario antes de llamarlo.",
    schema: z.object({ id: uuid }),
    hints: { destructiveHint: true, idempotentHint: true },
    async run({ id }, { db, userId }) {
      const { data, error } = await db.from("budgets").delete().eq("id", id).eq("user_id", userId).select("id");
      if (error) return dbFail(error, "No se pudo eliminar el presupuesto.");
      return data.length === 0 ? fail("No existe ese presupuesto.") : ok({ eliminado: id });
    },
  }),

  /* --- Ajustes ------------------------------------------------------------ */
  tool({
    name: "obtener_ajustes",
    description: "Ajustes del perfil: moneda, zona horaria, día de cobro, reparto 50/30/20 y umbral de alerta.",
    schema: noArgs,
    hints: { readOnlyHint: true },
    async run(_args, ctx) {
      const p = await getProfile(ctx);
      if (!p) return fail("No se encontró el perfil del usuario.");
      return ok({
        currency: p.currency,
        timezone: p.timezone,
        payday: p.payday,
        needs_pct: p.needs_pct,
        wants_pct: p.wants_pct,
        savings_pct: p.savings_pct,
        alert_threshold_pct: p.alert_threshold_pct,
      });
    },
  }),

  tool({
    name: "actualizar_ajustes",
    description:
      "Cambia ajustes del perfil; solo se modifican los campos indicados. needs_pct + wants_pct + savings_pct " +
      "deben sumar 100: si cambias uno, indica también los otros para que cuadre.",
    schema: z.object({
      currency: z.string().regex(/^[A-Z]{3}$/, "Código ISO de 3 letras, p. ej. PYG").optional(),
      timezone: z.string().optional().describe("Zona horaria IANA, p. ej. America/Asuncion"),
      payday: z.number().int().min(1).max(28).optional(),
      needs_pct: z.number().min(0).max(100).optional(),
      wants_pct: z.number().min(0).max(100).optional(),
      savings_pct: z.number().min(0).max(100).optional(),
      alert_threshold_pct: z.number().int().min(50).max(100).optional(),
    }),
    hints: { idempotentHint: true },
    async run(changes, ctx) {
      const values: TablesUpdate<"profiles"> = Object.fromEntries(
        Object.entries(changes).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(values).length === 0) return fail("No indicaste ningún campo para cambiar.");

      if (changes.timezone) {
        try {
          new Intl.DateTimeFormat("en", { timeZone: changes.timezone });
        } catch {
          return fail("Zona horaria inválida.");
        }
      }

      const current = await getProfile(ctx);
      if (!current) return fail("No se encontró el perfil del usuario.");
      const merged = { ...current, ...values } as typeof current;
      const sum = merged.needs_pct + merged.wants_pct + merged.savings_pct;
      if (Math.abs(sum - 100) > 0.001) {
        return fail(
          `El reparto debe sumar 100 y con esos valores suma ${round2(sum)} ` +
            `(esenciales ${merged.needs_pct}, flexibles ${merged.wants_pct}, ahorro ${merged.savings_pct}). ` +
            "Indica los tres porcentajes.",
        );
      }

      const { data, error } = await ctx.db
        .from("profiles")
        .update(values)
        .eq("id", ctx.userId)
        .select("currency, timezone, payday, needs_pct, wants_pct, savings_pct, alert_threshold_pct")
        .single();
      return error ? dbFail(error, "No se pudieron guardar los ajustes.") : ok({ ajustes: data });
    },
  }),
];

/* -------------------------------------------------------------------------- */
/* Registro                                                                   */
/* -------------------------------------------------------------------------- */

export const TOOLS = allTools.map((t) => {
  const inputSchema = z.toJSONSchema(t.schema, { io: "input" }) as Record<string, unknown>;
  delete inputSchema.$schema;
  return { name: t.name, description: t.description, inputSchema, annotations: t.hints };
});

const byName = new Map<string, (typeof allTools)[number]>(allTools.map((t) => [t.name, t]));

/** Ejecuta una herramienta en nombre de `userId` (el único usuario de la app). */
export async function callTool(name: string, args: unknown, userId: string): Promise<ToolResult> {
  const found = byName.get(name);
  if (!found) return fail(`Herramienta desconocida: ${name}`);

  const parsed = found.schema.safeParse(args ?? {});
  if (!parsed.success) return fail(`Argumentos inválidos: ${z.prettifyError(parsed.error)}`);

  return (found.run as (a: unknown, c: Ctx) => Promise<ToolResult>)(parsed.data, { db: createAdminClient(), userId });
}
