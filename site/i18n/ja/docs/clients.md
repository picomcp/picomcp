---
title: クライアントを接続する
description: Claude Code、Claude Desktop、Cursor、VS Code、MCP Inspector の設定方法。
group: はじめる
---

# クライアントを接続する

どの MCP クライアントも、ローカルサーバーを同じ方法で起動します。コマンドを実行し、stdio で通信するのです。リモートサーバーには URL を使い、Streamable HTTP で接続します。以下の設定では、すべて絶対パスを使ってください。

## Claude Code

```sh
# local, over stdio
claude mcp add weather -- node /absolute/path/main.ts

# remote, over HTTP
claude mcp add --transport http weather https://example.com/mcp
```

`--scope project` を付けると、サーバーが `.mcp.json` に書き込まれ、チームと共有できます。

## Claude Desktop

`claude_desktop_config.json` を編集し（設定 → 開発者 → 構成を編集）、アプリを再起動します：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/main.ts"]
    }
  }
}
```

## Cursor

プロジェクトに `.cursor/mcp.json` を作成します。すべてのプロジェクトで使う場合は `~/.cursor/mcp.json` を作成します：

```json
{
  "mcpServers": {
    "weather": { "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "url": "https://example.com/mcp" }
  }
}
```

## VS Code

`.vscode/mcp.json` を作成します：

```json
{
  "servers": {
    "weather": { "type": "stdio", "command": "node", "args": ["/absolute/path/main.ts"] },
    "remote-weather": { "type": "http", "url": "https://example.com/mcp" }
  }
}
```

## MCP Inspector

```sh
npx @modelcontextprotocol/inspector node /absolute/path/main.ts
```

HTTP サーバーを調べるには、`serve({ http: 3000 })` で起動してから Inspector を開き、**Streamable HTTP** を選んで `http://127.0.0.1:3000/mcp` を入力します。Inspector は localhost で動くため、picomcp はデフォルトで接続を許可します。

## Bun と Deno

`node` を使っているランタイムに置き換えます：

```json
{ "command": "bun", "args": ["/absolute/path/main.ts"] }
```

```json
{ "command": "deno", "args": ["run", "--allow-net", "/absolute/path/main.ts"] }
```

## トラブルシューティング

**クライアントにツールが 1 つも表示されない。** 設定に書いたコマンドを自分で実行してみてください。すぐに終了したりエラーが出たりするなら、クライアントにも同じことが起きています。

**クライアントのログに「Unexpected token」や JSON のエラーが出る。** 何かが stdout に書き込んでいます。picomcp は stdio で動作している間 `console.log` を stderr にリダイレクトしますが、他のライブラリが `process.stdout` に直接書き込んでいる可能性があります。

**Node が `.ts` ファイルを実行できない。** Node 22.18 以降にアップグレードするか、Bun でサーバーを起動してください。
