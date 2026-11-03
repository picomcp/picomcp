---
title: AI エージェント向け
description: 機械可読なドキュメント、llms.txt、Markdown ページ、そしてコーディングエージェントに渡すルール。
group: AI エージェント向け
---

# AI エージェント向け

コーディングエージェントは多くの MCP サーバーを書きます。このドキュメントは、あなたと同じようにエージェントにも読みやすく作られています。

## 機械可読なドキュメント

| URL | 内容 |
| --- | --- |
| [`/llms.txt`](/llms.txt) | 全ページの索引と 1 行の要約。[llms.txt](https://llmstxt.org) 形式 |
| [`/llms-full.txt`](/llms-full.txt) | ドキュメント全体を 1 つの Markdown ファイルにまとめたもの |
| `/docs/<page>.md` | 任意のページの Markdown。URL に `.md` を付けます。例：[`/docs/tools.md`](/docs/tools.md) |

各ページには**Markdown でコピー**ボタンもあり、チャットにそのまま貼り付けられます。

これらのファイルは英語です。英語が正本の言語であり、モデルが最もよく従える言語でもあります。各翻訳にも専用の `llms-full.txt` があります。例：`/fr/llms-full.txt`。

## エージェントにドキュメントを教える

次の内容をエージェントの指示に貼り付けてください。たとえばプロジェクトのルートにある `AGENTS.md` や `CLAUDE.md` です：

```md
## MCP servers

This project builds MCP servers with picomcp.

- Read https://picomcp.github.io/picomcp/llms-full.txt before writing picomcp code.
- Define servers with `pico({ name })` and chain `.tool()`, `.resource()`, `.prompt()`.
- Use Zod 4 schemas with `.describe()` on every field.
- Write tool descriptions and error messages for the model: say what the tool does,
  when to use it, and what to do after an error.
- Never write to stdout in a stdio server. Use `console.error` for logs.
- Test tools with `server.call(name, input)`. Do not spawn a client in unit tests.
```

## エージェントにドキュメントサーバーを渡す

ドキュメントは MCP サーバー [`picomcp-docs`](https://www.npmjs.com/package/picomcp-docs) としても提供しており、これ自体も picomcp で作られています。エージェントに `list_docs`、`search_docs`、`read_doc` の 3 つのツールを提供し、各ページをリソースとして公開します。

Claude Code の場合：

```sh
claude mcp add picomcp-docs -- npx -y picomcp-docs
```

Cursor、Windsurf、Claude Desktop など多くのクライアントでは、MCP の設定ファイルに追加します（Cursor では `.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "picomcp-docs": { "command": "npx", "args": ["-y", "picomcp-docs"] }
  }
}
```

ソースコードは [`packages/docs`](https://github.com/picomcp/picomcp/tree/main/packages/docs) にあり、約 100 行です。

## エージェントがよく間違えること

モデルが MCP サーバーを書くときに最もよくある間違いと、picomcp での正しい動作です：

- **stdio モードでは stdout がプロトコルそのもの。** `console.log` 1 つで壊れてしまいます。picomcp は stdio で動作している間コンソール出力を stderr にリダイレクトしますが、`process.stdout.write` は依然として危険です。
- **ツールのエラーは例外ではなく結果。** `run` の中でエラーを投げると、あなたのメッセージ付きの `isError: true` になります。モデルはそれを見て再試行できます。`"Error: ..."` という文字列を返すためだけにエラーを捕まえないでください。
- **プロンプトの引数は文字列。** 数値のプロンプト引数には `z.coerce.number()` を使います。
- **JSON Schema はスキーマライブラリから生成される。** Zod 4 と ArkType は何もいりません。Valibot には `toStandardJsonSchema` が、その他には `withJsonSchema` が必要です。
- **`server.fetch` はパスを見ない。** `/mcp` へのルーティングは自分で行うか、`/mcp` にだけ応答する `serve({ http })` を使ってください。
- **型付きの `server.call` にはチェーンが必要。** `pico().tool().tool()` なら型が保たれます。別々の文で書くと型が失われます。

## エージェントと一緒に貢献する

リポジトリには [`AGENTS.md`](https://github.com/picomcp/picomcp/blob/main/AGENTS.md) があり、picomcp 自体の開発ルールがまとめられています。サイズの上限、テストのコマンド、設計上の制約です。
