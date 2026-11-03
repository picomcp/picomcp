import { PROTOCOL_VERSIONS } from "./constants.ts";
import type { Server, ServerInfo } from "./types.ts";

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const rpcError = (code: number, message: string) => ({ jsonrpc: "2.0", id: null, error: { code, message } });

/**
 * Builds a Streamable HTTP handler on Web-standard `Request`/`Response`.
 * Stateless: every POST carries one JSON-RPC message (or batch) and gets a
 * JSON answer. Works on Bun, Deno, Node 22+, Cloudflare Workers and any
 * framework that speaks `fetch` (Hono, Elysia, Next.js route handlers…).
 */
export function createFetch(handle: Server["handle"], origins: ServerInfo["origins"]) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    if (origin && origins !== "*" && !(origins ? origins.includes(origin) : LOCALHOST.test(origin))) {
      return Response.json(rpcError(-32000, `Origin not allowed: ${origin}`), { status: 403 });
    }
    const headers: Record<string, string> = origin
      ? {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "content-type, authorization, mcp-protocol-version, mcp-session-id, last-event-id",
          "access-control-expose-headers": "mcp-session-id",
          vary: "origin",
        }
      : {};

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...headers, "access-control-allow-methods": "POST, OPTIONS" } });
    }
    // No server-to-client stream is offered, which the spec allows: answer GET/DELETE with 405.
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, allow: "POST, OPTIONS" } });

    const version = request.headers.get("mcp-protocol-version");
    if (version && !PROTOCOL_VERSIONS.includes(version)) {
      return Response.json(rpcError(-32600, `Unsupported protocol version: ${version}`), { status: 400, headers });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(rpcError(-32700, "Parse error"), { status: 400, headers });
    }
    const response = await handle(body);
    return response === undefined ? new Response(null, { status: 202, headers }) : Response.json(response, { headers });
  };
}
