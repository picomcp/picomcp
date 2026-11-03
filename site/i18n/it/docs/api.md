---
title: Riferimento API
description: Tutti gli export di picomcp, con le loro firme.
group: Riferimento
---

# Riferimento API

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

Crea un server.

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

Registra un tool e restituisce il server. Vedi [Tool](/docs/tools).

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

Lancia un `TypeError` per un nome non valido o duplicato, o per uno schema senza supporto al JSON Schema.

## server.resource(uri, config)

Registra una risorsa, o un template di risorsa quando `uri` contiene `{variables}`. Restituisce il server. Vedi [Risorse](/docs/resources).

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

Registra un prompt e restituisce il server. Vedi [Prompt](/docs/prompts).

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

Esegue un tool nel processo e restituisce il suo `CallToolResult`. Controllato dai tipi quando i tool sono stati registrati in catena. Rifiuta la promise per un nome di tool sconosciuto. Vedi [Test](/docs/testing).

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

Avvia il server via stdio, oppure via Streamable HTTP quando `http` è impostato. Vedi [Trasporti](/docs/transports).

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Handler Streamable HTTP conforme agli standard del Web. È legato al server, quindi lo si può passare come un semplice valore.

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

Elabora un messaggio JSON-RPC o un batch. Restituisce la risposta, oppure `undefined` per le notifiche.

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

Il secondo argomento di ogni handler.

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## Helper di contenuto

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` è base64 o byte grezzi. I byte vengono codificati per te su ogni runtime.

## withJsonSchema(schema, jsonSchema, output?)

Aggiunge un JSON Schema a uno Standard Schema che non sa generarne uno. Vedi [Schemi](/docs/schemas).

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

Lanciala da un handler per rispondere con un errore JSON-RPC invece che con un risultato.

```ts
new McpError(code: number, message: string, data?: unknown);
```

| Codice | Significato |
| --- | --- |
| `-32602` | Parametri non validi |
| `-32002` | Risorsa non trovata |
| da `-32000` a `-32099` | Liberi per gli errori del tuo server |

## PROTOCOL_VERSIONS

Le versioni del protocollo MCP che picomcp parla, dalla più recente: `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`.

## Helper di tipo

| Tipo | Descrizione |
| --- | --- |
| `Infer<S>` | Tipo di output di uno schema |
| `InferInput<S>` | Tipo di input di uno schema |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | L’interfaccia Standard Schema, incorporata |
