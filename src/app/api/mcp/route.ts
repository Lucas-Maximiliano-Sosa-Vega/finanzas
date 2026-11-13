import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { TOOLS, callTool } from "@/features/mcp/tools";

/**
 * Servidor MCP (Streamable HTTP, sin estado) para registrar movimientos desde Claude.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   MCP_SECRET                 clave larga y aleatoria que protege este endpoint
 *   MCP_USER_ID                UUID del usuario (auth.users.id) dueño de los datos
 *   SUPABASE_SERVICE_ROLE_KEY  clave de servicio de Supabase (solo servidor)
 *
 * Autenticación: `Authorization: Bearer <MCP_SECRET>` o `?key=<MCP_SECRET>`
 * (los conectores personalizados de Claude permiten indicar la clave en la URL).
 */

export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "finanzas", version: "0.1.0" };

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function isAuthorized(request: NextRequest, secret: string) {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer ?? request.nextUrl.searchParams.get("key");
  return provided !== null && safeEqual(provided, secret);
}

const reply = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0" as const, id: id ?? null, result });
const rpcError = (id: RpcRequest["id"], code: number, message: string) => ({
  jsonrpc: "2.0" as const,
  id: id ?? null,
  error: { code, message },
});

async function handle(rpc: RpcRequest, userId: string) {
  const isNotification = rpc.id === undefined;

  switch (rpc.method) {
    case "initialize":
      return reply(rpc.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "ping":
      return reply(rpc.id, {});
    case "tools/list":
      return reply(rpc.id, { tools: TOOLS });
    case "tools/call": {
      const name = typeof rpc.params?.name === "string" ? rpc.params.name : "";
      try {
        return reply(rpc.id, await callTool(name, rpc.params?.arguments, userId));
      } catch (error) {
        console.error("MCP tool error", name, error);
        return reply(rpc.id, { content: [{ type: "text", text: "Error interno." }], isError: true });
      }
    }
    default:
      return isNotification ? null : rpcError(rpc.id, -32601, `Método no soportado: ${rpc.method}`);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.MCP_SECRET;
  const userId = process.env.MCP_USER_ID;
  if (!secret || secret.length < 24 || !userId) {
    return new Response("MCP no configurado", { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return new Response("No autorizado", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "JSON inválido"), { status: 400 });
  }

  const requests = (Array.isArray(body) ? body : [body]) as RpcRequest[];
  if (requests.some((r) => !r || typeof r.method !== "string")) {
    return Response.json(rpcError(null, -32600, "Petición inválida"), { status: 400 });
  }

  const responses = (await Promise.all(requests.map((r) => handle(r, userId)))).filter((r) => r !== null);
  if (responses.length === 0) return new Response(null, { status: 202 });

  return Response.json(Array.isArray(body) ? responses : responses[0], {
    headers: { "Cache-Control": "no-store" },
  });
}

// Servidor sin estado: no ofrece stream SSE ni sesiones.
export function GET() {
  return new Response("Método no permitido", { status: 405, headers: { Allow: "POST" } });
}
