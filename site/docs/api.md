---
title: API reference
description: Every export of picomcp, with signatures.
group: Reference
---

# API reference

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

Creates a server.

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

Registers a tool and returns the server. See [Tools](/docs/tools).

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

Throws a `TypeError` for an invalid or duplicate name, or a schema without JSON Schema support.

## server.resource(uri, config)

Registers a resource, or a resource template when `uri` contains `{variables}`. Returns the server. See [Resources](/docs/resources).

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

Registers a prompt and returns the server. See [Prompts](/docs/prompts).

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

Runs a tool in-process and returns its `CallToolResult`. Type-checked when tools were registered by chaining. Rejects for an unknown tool name. See [Testing](/docs/testing).

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

Starts the server over stdio, or over Streamable HTTP when `http` is set. See [Transports](/docs/transports).

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Web-standard Streamable HTTP handler. Bound to the server, so it can be passed around as a value.

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

Processes one JSON-RPC message or a batch. Returns the response, or `undefined` for notifications.

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

The second argument of every handler.

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## Content helpers

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` is base64 or raw bytes. Bytes are encoded for you on every runtime.

## withJsonSchema(schema, jsonSchema, output?)

Attaches a JSON Schema to a Standard Schema that cannot generate one. See [Schemas](/docs/schemas).

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

Throw it from a handler to answer with a JSON-RPC error instead of a result.

```ts
new McpError(code: number, message: string, data?: unknown);
```

| Code | Meaning |
| --- | --- |
| `-32602` | Invalid params |
| `-32002` | Resource not found |
| `-32000` to `-32099` | Free for your own server errors |

## PROTOCOL_VERSIONS

The MCP protocol versions picomcp speaks, newest first: `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`.

## Type helpers

| Type | Description |
| --- | --- |
| `Infer<S>` | Output type of a schema |
| `InferInput<S>` | Input type of a schema |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | The Standard Schema interface, inlined |
