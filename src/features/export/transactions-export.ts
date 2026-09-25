import "server-only";

import { createClient } from "@/lib/supabase/server";

/** PostgREST limita cada respuesta (1000 filas por defecto): se pagina. */
const PAGE_SIZE = 1000;

export interface ExportRow {
  fecha: string;
  tipo: "ingreso" | "gasto";
  importe: number;
  categoria: string;
  subcategoria: string;
  bloque: string;
  cuenta: string;
  tipo_cuenta: string;
  descripcion: string;
  creado: string;
}

const BUCKET_LABEL = { needs: "esenciales", wants: "flexibles", savings: "ahorro" } as const;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchAllTransactions(supabase: Supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, occurred_on, kind, amount, description, account_id, category_id, created_at")
      .order("occurred_on", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export async function getExportRows(): Promise<ExportRow[]> {
  const supabase = await createClient();

  const [transactions, categories, accounts] = await Promise.all([
    fetchAllTransactions(supabase),
    supabase.from("categories").select("id, parent_id, name, bucket"),
    supabase.from("accounts").select("id, name, type"),
  ]);
  if (categories.error) throw categories.error;
  if (accounts.error) throw accounts.error;

  const categoryById = new Map(categories.data.map((c) => [c.id, c]));
  const accountById = new Map(accounts.data.map((a) => [a.id, a]));

  return transactions.map((t) => {
    const category = categoryById.get(t.category_id);
    const parent = category?.parent_id ? categoryById.get(category.parent_id) : undefined;
    const account = accountById.get(t.account_id);

    return {
      fecha: t.occurred_on,
      tipo: t.kind === "income" ? "ingreso" : "gasto",
      importe: Number(t.amount),
      categoria: parent?.name ?? category?.name ?? "",
      subcategoria: parent ? (category?.name ?? "") : "",
      bloque: category?.bucket ? BUCKET_LABEL[category.bucket] : "",
      cuenta: account?.name ?? "",
      tipo_cuenta: account?.type ?? "",
      descripcion: t.description ?? "",
      creado: t.created_at,
    };
  });
}

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  // Evita inyección de fórmulas al abrir el archivo en Excel/Sheets.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCSV(rows: ExportRow[]): string {
  const headers: (keyof ExportRow)[] = [
    "fecha",
    "tipo",
    "importe",
    "categoria",
    "subcategoria",
    "bloque",
    "cuenta",
    "tipo_cuenta",
    "descripcion",
    "creado",
  ];
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(","))];
  // BOM para que Excel detecte UTF-8 (tildes, ñ).
  return `﻿${lines.join("\r\n")}\r\n`;
}
