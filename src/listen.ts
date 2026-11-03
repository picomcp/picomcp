import type { HttpOptions, Running } from "./types.ts";

type Fetch = (request: Request) => Promise<Response>;

/** Starts an HTTP server on Bun, Deno or Node, with the MCP endpoint at `path`. */
export async function listen(fetch: Fetch, options: number | HttpOptions): Promise<Running> {
  const { port = 3000, hostname = "127.0.0.1", path = "/mcp" } = typeof options === "number" ? { port: options } : options;
  const routed: Fetch = (request) =>
    new URL(request.url).pathname === path ? fetch(request) : Promise.resolve(new Response("Not found", { status: 404 }));
  const url = (p: number) => `http://${hostname.includes(":") ? `[${hostname}]` : hostname}:${p}${path}`;
  const g = globalThis as any;

  if (g.Bun) {
    const server = g.Bun.serve({ port, hostname, fetch: routed });
    return { url: url(server.port), close: async () => server.stop(true) };
  }

  if (g.Deno) {
    const server = g.Deno.serve({ port, hostname, onListen() {} }, routed);
    return { url: url(server.addr.port), close: () => server.shutdown() };
  }

  // Node: a non-literal specifier keeps bundlers targeting the edge from resolving node:http.
  const specifier = "node:http";
  const { createServer } = await import(/* @vite-ignore */ specifier);
  const server = createServer(async (req: any, res: any) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }
    const response = await routed(
      new Request(`http://${req.headers.host ?? hostname}${req.url}`, {
        method: req.method,
        headers,
        body: chunks.length ? new Blob(chunks as BlobPart[]) : undefined,
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(new Uint8Array(await response.arrayBuffer()));
  });
  await new Promise<void>((resolve) => server.listen(port, hostname, resolve));
  return {
    url: url(server.address().port),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
