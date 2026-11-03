---
title: Referencia de la API
description: Todas las exportaciones de picomcp, con sus firmas.
group: Referencia
---

# Referencia de la API

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

Crea un servidor.

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

Registra una herramienta y devuelve el servidor. Ver [Herramientas](/docs/tools).

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

Lanza un `TypeError` ante un nombre inválido o repetido, o ante un esquema sin soporte de JSON Schema.

## server.resource(uri, config)

Registra un recurso, o una plantilla de recurso cuando `uri` contiene `{variables}`. Devuelve el servidor. Ver [Recursos](/docs/resources).

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

Registra un prompt y devuelve el servidor. Ver [Prompts](/docs/prompts).

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

Ejecuta una herramienta en el mismo proceso y devuelve su `CallToolResult`. Se comprueba con los tipos cuando las herramientas se registraron encadenadas. Se rechaza ante un nombre de herramienta desconocido. Ver [Tests](/docs/testing).

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

Arranca el servidor por stdio, o por Streamable HTTP cuando se define `http`. Ver [Transportes](/docs/transports).

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Handler Streamable HTTP que sigue los estándares web. Está ligado al servidor, así que se puede pasar como un valor.

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

Procesa un mensaje JSON-RPC o un lote. Devuelve la respuesta, o `undefined` para las notificaciones.

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

El segundo argumento de cada handler.

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## Helpers de contenido

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` es base64 o bytes en bruto. Los bytes se codifican por ti en cualquier runtime.

## withJsonSchema(schema, jsonSchema, output?)

Añade un JSON Schema a un Standard Schema que no puede generarlo. Ver [Esquemas](/docs/schemas).

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

Lánzalo desde un handler para responder con un error JSON-RPC en lugar de un resultado.

```ts
new McpError(code: number, message: string, data?: unknown);
```

| Código | Significado |
| --- | --- |
| `-32602` | Parámetros inválidos |
| `-32002` | Recurso no encontrado |
| de `-32000` a `-32099` | Libres para los errores de tu servidor |

## PROTOCOL_VERSIONS

Las versiones del protocolo MCP que habla picomcp, de la más reciente a la más antigua: `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`.

## Helpers de tipos

| Tipo | Descripción |
| --- | --- |
| `Infer<S>` | Tipo de salida de un esquema |
| `InferInput<S>` | Tipo de entrada de un esquema |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | La interfaz Standard Schema, integrada |
