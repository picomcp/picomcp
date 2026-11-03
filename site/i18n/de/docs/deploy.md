---
title: Deployment
description: Einen entfernten MCP-Server auf Cloudflare Workers, Deno Deploy, Bun, Node, Hono oder Next.js betreiben, mit Authentifizierung.
group: Anleitungen
---

# Deployment

Einen entfernten Server erreicht man per URL über Streamable HTTP. Weil picomcp zustandslos ist, läuft es ohne zusätzliche Einrichtung auf Serverless-Plattformen.

## Cloudflare Workers

```ts
import { server } from "./server.ts";

export default {
  fetch(request: Request) {
    if (new URL(request.url).pathname !== "/mcp") return new Response("Not found", { status: 404 });
    return server.fetch(request);
  },
};
```

```sh
npx wrangler deploy src/worker.ts
```

## Deno Deploy

```ts
import { server } from "./server.ts";

Deno.serve((request) => server.fetch(request));
```

## Bun

```ts
Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: { "/mcp": server.fetch },
});
```

## Node

```ts
await server.serve({ http: { port: Number(process.env.PORT ?? 3000), hostname: "0.0.0.0" } });
```

## Hono

```ts
import { Hono } from "hono";

const app = new Hono();
app.all("/mcp", (c) => server.fetch(c.req.raw));
export default app;
```

## Next.js

```ts
// app/mcp/route.ts
import { server } from "@/lib/mcp";

export const POST = server.fetch;
export const GET = server.fetch;
export const OPTIONS = server.fetch;
```

## Authentifizierung

picomcp kümmert sich nicht selbst um Authentifizierung: Umschließe `server.fetch` und prüfe die Anfrage, bevor sie deine Tools erreicht.

```ts
export default {
  async fetch(request: Request, env: { TOKEN: string }) {
    if (request.headers.get("authorization") !== `Bearer ${env.TOKEN}`) {
      return new Response("Unauthorized", { status: 401, headers: { "www-authenticate": "Bearer" } });
    }
    return server.fetch(request);
  },
};
```

Clients senden den Header aus ihrer Konfiguration, zum Beispiel:

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

Für OAuth setzt du die Middleware deines Anbieters vor `server.fetch` und folgst der [MCP-Autorisierungsspezifikation](https://modelcontextprotocol.io/specification/latest/basic/authorization).

## Checkliste

- Über HTTPS ausliefern.
- Authentifizierung verlangen, außer der Server ist öffentlich und nur lesend.
- `origins` auf die Browser-Origins setzen, die du erwartest, falls es welche gibt.
- Secrets in Umgebungsvariablen halten, nie in Tool-Beschreibungen oder -Ergebnissen.
- Tool-Argumente als nicht vertrauenswürdige Eingaben behandeln: Das Modell kann von Inhalten beeinflusst werden, die es liest.
