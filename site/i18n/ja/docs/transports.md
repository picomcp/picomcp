---
title: トランスポート
description: ローカルクライアント向けの stdio、リモート向けの Streamable HTTP、そして両方を支える fetch ハンドラー。
group: ガイド
---

# トランスポート

トランスポートは、クライアントとサーバーの間で JSON-RPC メッセージを運びます。picomcp は MCP が定義する 2 つのトランスポートに対応しています。どちらを使っても、ツールのコードは変わりません。

## stdio

```ts
await server.serve();
```

クライアントはサーバーを子プロセスとして起動し、改行区切りの JSON を stdin と stdout でやり取りします。デスクトップクライアントやコーディングエージェントは、ローカルサーバーをこの方法で使います。

stdout はプロトコル専用です。stdio で動作している間、picomcp は `console.log`、`console.info`、`console.debug` を stderr にリダイレクトするので、うっかり出力したログで接続が壊れることはありません。クライアントは通常、stderr を自身のログに表示します。

## Streamable HTTP

```ts
const running = await server.serve({ http: 3000 });
console.error(`Listening on ${running.url}`); // http://127.0.0.1:3000/mcp
```

`serve({ http })` は、実行中のランタイム（Bun、Deno、Node）でサーバーを起動します。オプション：

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `port` | `3000` | 待ち受けるポート。`0` なら空いているポートを選びます。 |
| `hostname` | `"127.0.0.1"` | 他のマシンからの接続を受け付けるには `"0.0.0.0"` を使います。 |
| `path` | `"/mcp"` | エンドポイントのパス。それ以外のパスは 404 を返します。 |

戻り値は `{ url, close() }` です。

## fetch ハンドラー

`server.fetch` は、Web 標準の `(Request) => Promise<Response>` 関数です。`fetch` を扱えるランタイムやフレームワークなら、どれにでも渡せます：

```ts
Bun.serve({ port: 3000, fetch: server.fetch });
```

```ts
Deno.serve({ port: 3000 }, server.fetch);
```

```ts
export default { fetch: server.fetch }; // Cloudflare Workers
```

`server.fetch` はパスを見ません。リクエストのルーティングは自分で行ってください。その他のプラットフォームは[デプロイ](/docs/deploy)を参照してください。

## picomcp の HTTP の扱い

picomcp は Streamable HTTP をステートレスな JSON モードで動かします：

- JSON-RPC メッセージまたはバッチを含む `POST` → JSON のレスポンスとともに `200`。通知の場合は `202`。
- `GET` と `DELETE` → `405`。サーバーからクライアントへのストリームを提供しないことをクライアントに伝えます。
- `OPTIONS` → 許可されたオリジン向けの CORS プリフライト。
- サポートしていない `MCP-Protocol-Version` ヘッダー → `400`。

保存すべきセッションがないので、どのインスタンスでもどのリクエストにも応答できます。そのため picomcp は、サーバーレスプラットフォーム、ロードバランサー、オートスケーリングに追加の作業なしで対応できます。

## オリジンと DNS リバインディング

ブラウザは `Origin` ヘッダーを送ります。悪意のあるページがそれを使ってあなたのマシン上のサーバーにアクセスするおそれがあるため、picomcp はこのヘッダーをチェックします：

- `Origin` のないリクエスト（CLI、サーバー、デスクトップアプリ）は常に許可されます。
- デフォルトでは、`localhost`、`127.0.0.1`、`[::1]` のオリジンだけが許可されます。ポートは問いません。
- それ以外のオリジンには `403` が返ります。

`origins` オプションで許可するオリジンを追加できます：

```ts
pico({ name: "notes", origins: ["https://claude.ai", "https://app.example.com"] });
pico({ name: "public", origins: "*" }); // any origin: only for public, unauthenticated servers
```

## カスタムトランスポート

`server.handle(message)` は JSON-RPC メッセージ 1 つ、またはバッチを処理してレスポンスを返します。通知に対しては `undefined` を返します。これを使えば、WebSocket やメッセージキューなど、何にでも picomcp をつなげられます：

```ts
socket.on("message", async (data) => {
  const response = await server.handle(JSON.parse(data));
  if (response) socket.send(JSON.stringify(response));
});
```
