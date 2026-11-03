---
title: はじめに
description: picomcp とは何か、何ではないか、そしてそれを説明する 10 行のコード。
group: はじめる
---

# はじめに

picomcp は、[Model Context Protocol](https://modelcontextprotocol.io) サーバーを作るための TypeScript フレームワークです。MCP サーバーは AI アプリケーション（Claude、Cursor、VS Code、あなた自身のエージェント）に、呼び出せる**ツール**、読み取れる**リソース**、ユーザーに提示できる**プロンプト**を提供します。

```ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve();
```

これだけで完全なサーバーです。`node server.ts` で起動し、任意の MCP クライアントに接続できます。

## picomcp を選ぶ理由

- **小さい。** gzip で約 4 kB、依存関係ゼロ。ライブラリ全体を頭に入れられ、1 回のコードレビューで読み切れます。
- **スキーマから型を生成。** Zod、Valibot、ArkType のスキーマを渡すだけ。ハンドラーは型付きの引数を受け取り、クライアントは JSON Schema を受け取り、不正な呼び出しには読みやすいエラーが返ります。
- **どこでも動く。** Node 22+、Bun、Deno、Cloudflare Workers、そして `fetch` を持つあらゆるランタイム。コアは Node の組み込みモジュールを使いません。
- **2 つのトランスポートに 1 つのサーバー。** デスクトップクライアントには stdio、リモートサーバーには Streamable HTTP。オプション 1 つで切り替えられます。
- **クライアントなしでテスト可能。** `server.call("forecast", { city: "Lyon" })` でツールをプロセス内で実行でき、型も完全に効きます。
- **公式 SDK で検証済み。** テストスイートは `@modelcontextprotocol/sdk` を使い、両方のトランスポートで picomcp を動かしています。

## picomcp ではないもの

picomcp が実装するのは MCP のサーバー側だけです。クライアント、エージェントループ、LLM SDK は含みません。ほとんどのサーバーに必要な、プロトコルのうちステートレスなリクエスト/レスポンスの部分に注力しています。sampling や elicitation のようにサーバーから開始する機能はまだサポートしていません。正確な一覧は[プロトコル対応状況](/docs/protocol)を参照してください。

## 次のステップ

- [クイックスタート](/docs/quickstart)：5 分でサーバーを作って接続する。
- [ツール](/docs/tools)：ツールにできることのすべて。
- [AI エージェント向け](/docs/agents)：URL 1 つでコーディングエージェントにドキュメントを渡す。
