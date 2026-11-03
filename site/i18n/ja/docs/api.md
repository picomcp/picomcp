---
title: API リファレンス
description: picomcp のすべてのエクスポートとそのシグネチャ。
group: リファレンス
---

# API リファレンス

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

サーバーを作成します。

```ts
function pico(info: ServerInfo): Server;

interface ServerInfo {
  name: string;                // machine-friendly name, e.g. "weather"
  version?: string;            // defaults to "0.0.0"
  title?: string;              // display name
  instructions?: string;       // how the model should use the server as a whole
  origins?: string[] | "*";    // allowed browser origins for HTTP; defaults to localhost
}
```

## server.tool(name, config)

ツールを登録し、サーバーを返します。[ツール](/docs/tools)を参照。

```ts
interface ToolConfig<I, O> {
  title?: string;
  description?: string;
  input?: I;                   // Standard Schema
  output?: O;                  // Standard Schema; enables structuredContent
  annotations?: ToolAnnotations;
  run(input: Infer<I>, ctx: Context): Return | Promise<Return>;
}

interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}
```

名前が不正または重複している場合、またはスキーマが JSON Schema に対応していない場合は `TypeError` を投げます。

## server.resource(uri, config)

リソースを登録します。`uri` に `{variables}` が含まれる場合はリソーステンプレートとして登録します。サーバーを返します。[リソース](/docs/resources)を参照。

```ts
interface ResourceConfig<U extends string> {
  name?: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
  read(params: UriParams<U>, ctx: Context & { uri: string }): ResourceReturn | Promise<ResourceReturn>;
}
```

## server.prompt(name, config)

プロンプトを登録し、サーバーを返します。[プロンプト](/docs/prompts)を参照。

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

ツールをプロセス内で実行し、その `CallToolResult` を返します。ツールをチェーンで登録した場合は型チェックされます。未知のツール名の場合は Promise が reject されます。[テスト](/docs/testing)を参照。

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

stdio でサーバーを起動します。`http` を指定した場合は Streamable HTTP で起動します。[トランスポート](/docs/transports)を参照。

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Web 標準の Streamable HTTP ハンドラー。サーバーにバインドされているので、値としてそのまま渡せます。

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

JSON-RPC メッセージ 1 つ、またはバッチを処理します。レスポンスを返し、通知に対しては `undefined` を返します。

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

すべてのハンドラーの第 2 引数。

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## コンテンツヘルパー

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` は base64 文字列か生のバイト列です。バイト列はどのランタイムでも自動的にエンコードされます。

## withJsonSchema(schema, jsonSchema, output?)

JSON Schema を生成できない Standard Schema に JSON Schema を添えます。[スキーマ](/docs/schemas)を参照。

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

ハンドラーから投げると、結果の代わりに JSON-RPC エラーを返します。

```ts
new McpError(code: number, message: string, data?: unknown);
```

| コード | 意味 |
| --- | --- |
| `-32602` | 不正なパラメーター |
| `-32002` | リソースが見つからない |
| `-32000` 〜 `-32099` | 独自のサーバーエラーに自由に使える |

## PROTOCOL_VERSIONS

picomcp が対応する MCP プロトコルのバージョン。新しい順：`["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`。

## 型ヘルパー

| 型 | 説明 |
| --- | --- |
| `Infer<S>` | スキーマの出力型 |
| `InferInput<S>` | スキーマの入力型 |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | 同梱の Standard Schema インターフェース |
