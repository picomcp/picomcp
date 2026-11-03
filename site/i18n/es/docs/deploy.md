---
title: Despliegue
description: Ejecutar un servidor MCP remoto en Cloudflare Workers, Deno Deploy, Bun, Node, Hono o Next.js, con autenticación.
group: Guías
---

# Despliegue

A un servidor remoto se llega por URL, con Streamable HTTP. Como picomcp no tiene estado, funciona en plataformas serverless sin configuración adicional.

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

## Autenticación

picomcp no gestiona la autenticación por sí mismo: envuelve `server.fetch` y comprueba la petición antes de que llegue a tus herramientas.

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

Los clientes envían la cabecera que indica su configuración, por ejemplo:

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

Para OAuth, pon el middleware de tu proveedor delante de `server.fetch` y sigue la [especificación de autorización de MCP](https://modelcontextprotocol.io/specification/latest/basic/authorization).

## Lista de comprobación

- Sirve por HTTPS.
- Exige autenticación, salvo que el servidor sea público y de solo lectura.
- Configura `origins` con los orígenes de navegador que esperas, si los hay.
- Guarda los secretos en variables de entorno, nunca en descripciones ni resultados de herramientas.
- Trata los argumentos de las herramientas como entradas no fiables: el modelo puede dejarse influir por el contenido que lee.
