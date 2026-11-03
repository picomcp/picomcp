---
title: デプロイ
description: Cloudflare Workers、Deno Deploy、Bun、Node、Hono、Next.js でリモート MCP サーバーを認証付きで動かします。
group: ガイド
---

# デプロイ

リモートサーバーには、URL を使って Streamable HTTP で接続します。picomcp はステートレスなので、追加の設定なしでサーバーレスプラットフォーム上で動きます。

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

## 認証

picomcp 自体は認証を扱いません。`server.fetch` をラップして、リクエストがツールに届く前にチェックしてください。

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

クライアントは設定に書いたヘッダーを送ります。たとえば：

```sh
claude mcp add --transport http notes https://notes.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

OAuth を使う場合は、プロバイダーのミドルウェアを `server.fetch` の前に置き、[MCP の認可仕様](https://modelcontextprotocol.io/specification/latest/basic/authorization)に従ってください。

## チェックリスト

- HTTPS で提供する。
- サーバーが公開かつ読み取り専用でない限り、認証を必須にする。
- 想定するブラウザのオリジンがあれば、`origins` に設定する。
- シークレットは環境変数に置き、ツールの説明や結果には絶対に含めない。
- ツールの引数は信頼できない入力として扱う。モデルは読んだ内容に影響されることがあります。
