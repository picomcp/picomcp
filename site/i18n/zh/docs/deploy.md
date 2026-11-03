---
title: 部署
description: 在 Cloudflare Workers、Deno Deploy、Bun、Node、Hono 或 Next.js 上运行远程 MCP 服务器，并加上身份验证。
group: 指南
---

# 部署

远程服务器通过 URL，使用 Streamable HTTP 访问。picomcp 是无状态的，因此无需额外设置就能运行在 serverless 平台上。

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

## 身份验证

picomcp 本身不处理身份验证：请包装 `server.fetch`，在请求到达工具之前先做检查。

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

客户端会发送其配置中的请求头，例如：

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

如需 OAuth，请把身份提供方的中间件放在 `server.fetch` 之前，并遵循 [MCP 授权规范](https://modelcontextprotocol.io/specification/latest/basic/authorization)。

## 检查清单

- 通过 HTTPS 提供服务。
- 除非服务器是公开且只读的，否则要求身份验证。
- 如果有预期的浏览器来源，用 `origins` 设置它们。
- 把密钥放在环境变量中，绝不要写进工具描述或工具结果。
- 把工具参数当作不可信输入：模型可能受到它所读取内容的影响。
