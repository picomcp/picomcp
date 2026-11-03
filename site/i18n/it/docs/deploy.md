---
title: Deploy
description: Eseguire un server MCP remoto su Cloudflare Workers, Deno Deploy, Bun, Node, Hono o Next.js, con autenticazione.
group: Guide
---

# Deploy

Un server remoto si raggiunge tramite URL, con Streamable HTTP. Dato che picomcp è senza stato, gira sulle piattaforme serverless senza configurazione aggiuntiva.

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

## Autenticazione

picomcp non gestisce l’autenticazione da sé: avvolgi `server.fetch` e controlla la richiesta prima che raggiunga i tuoi tool.

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

I client inviano l’header indicato nella loro configurazione, per esempio:

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

Per OAuth, metti il middleware del tuo provider davanti a `server.fetch` e segui la [specifica di autorizzazione MCP](https://modelcontextprotocol.io/specification/latest/basic/authorization).

## Checklist

- Servi in HTTPS.
- Richiedi l’autenticazione, a meno che il server non sia pubblico e di sola lettura.
- Imposta `origins` sulle origini browser che ti aspetti, se ce ne sono.
- Tieni i segreti nelle variabili d’ambiente, mai nelle descrizioni o nei risultati dei tool.
- Tratta gli argomenti dei tool come input non attendibili: il modello può essere influenzato dai contenuti che legge.
