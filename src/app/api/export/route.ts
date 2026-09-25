import type { NextRequest } from "next/server";

import { getExportRows, toCSV } from "@/features/export/transactions-export";
import { getClaims } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await getClaims())) {
    return new Response("No autorizado", { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const rows = await getExportRows();
  const filename = `finanzas-${new Date().toISOString().slice(0, 10)}.${format}`;

  const body = format === "json" ? JSON.stringify(rows, null, 2) : toCSV(rows);
  const contentType = format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8";

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
