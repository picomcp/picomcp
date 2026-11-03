<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — ピコサイズの MCP サーバー。" src=".github/assets/banner-light.svg" width="100%">
</picture>

<p>
  <a href="https://www.npmjs.com/package/picomcp"><img alt="npm" src="https://img.shields.io/npm/v/picomcp?style=flat-square&color=1d3bff&label=npm"></a>
  <a href="https://jsr.io/@picomcp/picomcp"><img alt="JSR" src="https://img.shields.io/jsr/v/@picomcp/picomcp?style=flat-square&color=1d3bff&label=jsr"></a>
  <a href="https://github.com/picomcp/picomcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/picomcp/picomcp/ci.yml?branch=main&style=flat-square&label=ci"></a>
  <img alt="gzip size" src="https://img.shields.io/badge/gzip-3.9%20kB-1d3bff?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-1d3bff?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0f1f?style=flat-square"></a>
</p>

<p><a href="README.md">English</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.es.md">Español</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md"><b>日本語</b></a></p>

**picomcp** は、[Model Context Protocol](https://modelcontextprotocol.io) サーバーのための依存関係ゼロの TypeScript フレームワークです。どんな LLM にも、ファイル 1 つで本物のツールを。スキーマライブラリから型を生成し、stdio または HTTP で提供して、Node、Bun、Deno、エッジで動きます。

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

これだけで完全なサーバーです。**[ドキュメントを読む →](https://picomcp.github.io/picomcp/ja/docs/)**

## picomcp を選ぶ理由

|  |  |
| --- | --- |
| **gzip で 3.9 kB、依存関係ゼロ** | 一気に読み通せて、1 回のレビューで監査できる小ささです。CI のサイズ上限がこの小ささを守ります。 |
| **スキーマから型を生成** | [Standard Schema](https://standardschema.dev) 経由で Zod 4、ArkType、Valibot に対応。型付きハンドラー、自動生成される JSON Schema、そしてモデルが対処できる読みやすい検証エラー。 |
| **どこでも動く** | Node 22+、Bun、Deno、Cloudflare Workers。コアは Web API だけを使い、Node の組み込みモジュールは使いません。 |
| **stdio と Streamable HTTP** | 同じサーバーを、オプション 1 つで切り替え。Hono、Next.js、Workers などのための Web 標準の `fetch` ハンドラーもあります。 |
| **クライアントなしでテスト可能** | `server.call("forecast", { city: "Lyon" })` でツールをプロセス内で実行でき、名前と引数は型チェックされます。 |
| **公式 SDK で検証済み** | テストスイートは `@modelcontextprotocol/sdk` を使い、両方のトランスポートで picomcp を動かしています。 |

## インストール

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

サーバー、エントリーポイント、テストが揃ったプロジェクトを作成することもできます：

```sh
npx picomcp init my-server
```

## 5 つのスニペットで一巡り

**ツール**はモデルが呼び出す関数です。文字列、オブジェクト、メディアを返すか、エラーを投げます：

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

**構造化出力**は検証され、`structuredContent` として送られます：

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

**リソース**は URI テンプレートを使い、変数の型は文字列から推論されます：

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

**プロンプト**はクライアントでスラッシュコマンドになります：

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

**トランスポート**はそれぞれ 1 行です：

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## クライアントを接続する

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Claude Desktop、Cursor、VS Code の設定は[クライアントを接続する](https://picomcp.github.io/picomcp/ja/docs/clients)にあります。

## テストする

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## 人にもエージェントにも読めるドキュメント

[ドキュメント](https://picomcp.github.io/picomcp/ja/docs/)には <kbd>⌘</kbd> <kbd>K</kbd> で使える入力ミスに強い検索があり、8 か国語で読めます。各ページは AI エージェント向けにも公開しています：

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt)：全ページの索引
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt)：ドキュメント全体を 1 つのファイルに
- `docs/<page>.md`：任意のページの Markdown
- [`picomcp-docs`](packages/docs)：MCP サーバーとして提供するドキュメント。picomcp で作られています。`claude mcp add picomcp-docs -- npx -y picomcp-docs`

## 対象範囲

picomcp は MCP のサーバー側であり、ほとんどのサーバーに必要なステートレスなリクエスト/レスポンスのモデル向けに作られています。ライフサイクル、ツール（構造化出力とアノテーションを含む）、リソースとテンプレート、プロンプト、キャンセル、そして両方のトランスポートに対応しています。

サーバーから自発的にクライアントへメッセージを送る必要がある機能には、まだ対応していません。sampling、elicitation、roots、ログと進捗の通知、購読です。今すぐ必要な場合は、公式の [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) を使ってください。完全な一覧は[プロトコル対応状況](https://picomcp.github.io/picomcp/ja/docs/protocol)にあります。

## コントリビュート

issue や pull request を歓迎します。まず [CONTRIBUTING.md](CONTRIBUTING.md) を読み、それから：

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

コーディングエージェントと作業していますか？ エージェントへの指示は [AGENTS.md](AGENTS.md) にあります。

## ライセンス

[MIT](LICENSE)
