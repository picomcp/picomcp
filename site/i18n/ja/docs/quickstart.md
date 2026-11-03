---
title: クイックスタート
description: 最初の MCP サーバーを 5 分で作成、テスト、接続します。
group: はじめる
---

# クイックスタート

Node 22.18 以降（TypeScript ファイルを直接実行できます）、Bun、または Deno が必要です。

## プロジェクトを作成する

```sh
npx picomcp init my-server
cd my-server
npm install
```

すぐに動かせるサーバーが作成されます：

| ファイル | 役割 |
| --- | --- |
| `server.ts` | サーバーの定義：ツール、リソース、プロンプト |
| `main.ts` | stdio でサーバーを起動する |
| `server.test.ts` | ツールをプロセス内で呼び出すテスト |

ゼロから始めたい場合は、2 つのパッケージをインストールして `server.ts` を自分で書きます：

```sh
npm install picomcp zod
```

## ツールを書く

`server.ts` を開きます：

```ts
import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: "my-server", version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => `Hello, ${name}!`,
  });
```

- `description` は、モデルがいつツールを呼び出すかを判断するために読むものです。モデルに向けて書いてください。
- `input` には任意の [Standard Schema](/docs/schemas) を渡せます。`run` の中で `name` は `string` 型になります。
- ここでは `run` は文字列を返しています。オブジェクトやコンテンツブロックを返すことも、エラーを投げることもできます。詳しくは[ツール](/docs/tools)を参照してください。

## テストする

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
```

```sh
npm test
```

`server.call` は型チェックされます。ツール名のタイプミスや引数の不足はコンパイルエラーになります。

## 接続する

Claude Code の場合：

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

あとは Claude に誰かへの挨拶を頼んでみてください。Claude Desktop、Cursor、VS Code などについては[クライアントを接続する](/docs/clients)を参照してください。

## 中身を調べる

MCP Inspector を使うと、ツールを手動で呼び出して生のメッセージを確認できます：

```sh
npx @modelcontextprotocol/inspector node main.ts
```
