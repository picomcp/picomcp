---
title: API-Referenz
description: Alle Exporte von picomcp, mit Signaturen.
group: Referenz
---

# API-Referenz

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

Erstellt einen Server.

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

Registriert ein Tool und gibt den Server zurück. Siehe [Tools](/docs/tools).

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

Wirft einen `TypeError` bei einem ungültigen oder doppelten Namen oder bei einem Schema ohne JSON-Schema-Unterstützung.

## server.resource(uri, config)

Registriert eine Ressource, oder ein Ressourcen-Template, wenn `uri` `{variables}` enthält. Gibt den Server zurück. Siehe [Ressourcen](/docs/resources).

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

Registriert einen Prompt und gibt den Server zurück. Siehe [Prompts](/docs/prompts).

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

Führt ein Tool im selben Prozess aus und gibt sein `CallToolResult` zurück. Typgeprüft, wenn die Tools verkettet registriert wurden. Wird bei einem unbekannten Tool-Namen abgelehnt. Siehe [Testen](/docs/testing).

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

Startet den Server über stdio, oder über Streamable HTTP, wenn `http` gesetzt ist. Siehe [Transporte](/docs/transports).

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Webstandardkonformer Streamable-HTTP-Handler. An den Server gebunden, lässt sich also als Wert weitergeben.

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

Verarbeitet eine JSON-RPC-Nachricht oder einen Batch. Gibt die Antwort zurück, oder `undefined` bei Benachrichtigungen.

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

Das zweite Argument jedes Handlers.

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## Inhalts-Helfer

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` ist Base64 oder rohe Bytes. Bytes werden auf jeder Runtime für dich kodiert.

## withJsonSchema(schema, jsonSchema, output?)

Hängt ein JSON Schema an ein Standard Schema an, das selbst keines erzeugen kann. Siehe [Schemas](/docs/schemas).

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

Wirf sie in einem Handler, um mit einem JSON-RPC-Fehler statt eines Ergebnisses zu antworten.

```ts
new McpError(code: number, message: string, data?: unknown);
```

| Code | Bedeutung |
| --- | --- |
| `-32602` | Ungültige Parameter |
| `-32002` | Ressource nicht gefunden |
| `-32000` bis `-32099` | Frei für eigene Serverfehler |

## PROTOCOL_VERSIONS

Die MCP-Protokollversionen, die picomcp spricht, neueste zuerst: `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`.

## Typ-Helfer

| Typ | Beschreibung |
| --- | --- |
| `Infer<S>` | Ausgabetyp eines Schemas |
| `InferInput<S>` | Eingabetyp eines Schemas |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | Das Standard-Schema-Interface, eingebettet |
