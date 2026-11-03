---
title: Развёртывание
description: Удалённый MCP-сервер на Cloudflare Workers, Deno Deploy, Bun, Node, Hono или Next.js, с аутентификацией.
group: Руководства
---

# Развёртывание

До удалённого сервера клиенты добираются по URL через Streamable HTTP. Поскольку picomcp не хранит состояние, он работает на serverless-платформах без дополнительной настройки.

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

## Аутентификация

picomcp сам не занимается аутентификацией: оберните `server.fetch` и проверяйте запрос до того, как он дойдёт до инструментов.

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

Клиенты отправляют заголовок из своей конфигурации, например:

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

Для OAuth поставьте middleware вашего провайдера перед `server.fetch` и следуйте [спецификации авторизации MCP](https://modelcontextprotocol.io/specification/latest/basic/authorization).

## Чек-лист

- Отдавайте сервер по HTTPS.
- Требуйте аутентификацию, если только сервер не публичный и не работает только на чтение.
- Укажите в `origins` браузерные источники, которые ожидаете, если они есть.
- Храните секреты в переменных окружения, а не в описаниях или результатах инструментов.
- Считайте аргументы инструментов недоверенными данными: на модель может повлиять содержимое, которое она читает.
