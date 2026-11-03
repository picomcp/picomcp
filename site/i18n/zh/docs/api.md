---
title: API 参考
description: picomcp 的全部导出及其签名。
group: 参考
---

# API 参考

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

创建一个服务器。

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

注册一个工具并返回服务器。见[工具](/docs/tools)。

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

名称无效或重复，或者 schema 不支持 JSON Schema 时，会抛出 `TypeError`。

## server.resource(uri, config)

注册一个资源；当 `uri` 包含 `{variables}` 时，注册的是资源模板。返回服务器。见[资源](/docs/resources)。

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

注册一个提示词并返回服务器。见[提示词](/docs/prompts)。

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

在进程内运行一个工具，并返回它的 `CallToolResult`。如果工具以链式方式注册，调用会经过类型检查。工具名未知时，Promise 会被拒绝。见[测试](/docs/testing)。

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

通过 stdio 启动服务器；设置了 `http` 时，则通过 Streamable HTTP 启动。见[传输方式](/docs/transports)。

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

符合 Web 标准的 Streamable HTTP 处理函数。它已绑定到服务器，因此可以作为值直接传递。

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

处理一条 JSON-RPC 消息或一批消息。返回响应；对于通知，返回 `undefined`。

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

每个处理函数的第二个参数。

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## 内容辅助函数

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` 可以是 base64 字符串或原始字节。在任何运行时上，字节都会自动编码。

## withJsonSchema(schema, jsonSchema, output?)

为无法生成 JSON Schema 的 Standard Schema 附加一份 JSON Schema。见[Schema](/docs/schemas)。

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

在处理函数中抛出它，就会返回 JSON-RPC 错误，而不是结果。

```ts
new McpError(code: number, message: string, data?: unknown);
```

| 错误码 | 含义 |
| --- | --- |
| `-32602` | 参数无效 |
| `-32002` | 资源未找到 |
| `-32000` 至 `-32099` | 可自由用于你自己的服务器错误 |

## PROTOCOL_VERSIONS

picomcp 支持的 MCP 协议版本，从新到旧：`["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`。

## 类型辅助

| 类型 | 说明 |
| --- | --- |
| `Infer<S>` | schema 的输出类型 |
| `InferInput<S>` | schema 的输入类型 |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | 内联的 Standard Schema 接口 |
