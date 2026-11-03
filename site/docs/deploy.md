---
title: Deploy
description: Run a remote MCP server on Cloudflare Workers, Deno Deploy, Bun, Node, Hono or Next.js, with authentication.
group: Guides
---

# Deploy

A remote server is reached by URL over Streamable HTTP. Because picomcp is stateless, it runs on serverless platforms with no extra setup.

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

## Authentication

picomcp does not handle auth itself: wrap `server.fetch` and check the request before it reaches your tools.

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

Clients send the header from their config, for example:

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

For OAuth, put your provider's middleware in front of `server.fetch` and follow the [MCP authorization spec](https://modelcontextprotocol.io/specification/latest/basic/authorization).

## Checklist

- Serve over HTTPS.
- Require authentication unless the server is public and read-only.
- Set `origins` to the browser origins you expect, if any.
- Keep secrets in environment variables, never in tool descriptions or results.
- Treat tool arguments as untrusted input: the model can be steered by content it reads.
