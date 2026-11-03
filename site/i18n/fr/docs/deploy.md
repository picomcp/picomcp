---
title: Déployer
description: Faire tourner un serveur MCP distant sur Cloudflare Workers, Deno Deploy, Bun, Node, Hono ou Next.js, avec authentification.
group: Guides
---

# Déployer

Un serveur distant s’atteint par URL, en Streamable HTTP. Comme picomcp est sans état, il tourne sur les plateformes serverless sans configuration supplémentaire.

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

## Authentification

picomcp ne gère pas lui-même l’authentification : enveloppez `server.fetch` et vérifiez la requête avant qu’elle n’atteigne vos outils.

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

Les clients envoient l’en-tête défini dans leur configuration, par exemple :

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

Pour OAuth, placez le middleware de votre fournisseur devant `server.fetch` et suivez la [spécification d’autorisation MCP](https://modelcontextprotocol.io/specification/latest/basic/authorization).

## Check-list

- Servez en HTTPS.
- Exigez une authentification, sauf si le serveur est public et en lecture seule.
- Réglez `origins` sur les origines navigateur que vous attendez, s’il y en a.
- Gardez les secrets dans des variables d’environnement, jamais dans les descriptions ou les résultats des outils.
- Traitez les arguments des outils comme des entrées non fiables : le modèle peut être influencé par le contenu qu’il lit.
