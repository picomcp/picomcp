---
title: テスト
description: ツールを完全な型付きでプロセス内テストし、その後プロトコルをエンドツーエンドでテストします。
group: ガイド
---

# テスト

## ツールをプロセス内で呼び出す

`server.call(name, input)` は、トランスポートもサブプロセスも使わずに、クライアントとまったく同じようにツールを実行します。検証、デフォルト値、出力のチェック、エラー処理はすべて有効です。

```ts
import { describe, expect, it } from "vitest";
import { server } from "./server.ts";

describe("forecast", () => {
  it("returns the forecast", async () => {
    const result = await server.call("forecast", { city: "Lyon" });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ city: "Lyon" });
  });

  it("explains invalid input to the model", async () => {
    const result = await server.call("forecast", { city: "Lyon", days: 30 });
    expect(result.isError).toBe(true);
  });
});
```

どのテストランナーでも動きます：Vitest、`node:test`、`bun test`、`deno test`。

## 型チェックされる呼び出し

ツールをチェーンで登録すると、`call` はツール名と入力を把握します：

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

ツールを別々の文で登録すると、`server` の型はそれを追跡できず、`call` はどんな名前も受け付けてしまいます。呼び出しをチェーンするか、再代入してください：`const app = server.tool(...)`。

## プロトコルをテストする

`server.handle` は生の JSON-RPC を受け取ります。一覧やスキーマの確認に便利です：

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

`tools/list` のスナップショットを取っておけば、スキーマの変更でモデルに見える内容が変わったことに手軽に気づけます。

## 本物のクライアントでテストする

エンドツーエンドのテストでは、公式 SDK のクライアントから HTTP でサーバーを操作します：

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const running = await server.serve({ http: { port: 0 } });
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(running.url!)));

const { tools } = await client.listTools();

await client.close();
await running.close();
```

picomcp 自身のテストスイートも、stdio と HTTP の両方でまさにこれを行っています。
