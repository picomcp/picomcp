---
title: Référence de l’API
description: Tous les exports de picomcp, avec leurs signatures.
group: Référence
---

# Référence de l’API

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

Crée un serveur.

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

Enregistre un outil et renvoie le serveur. Voir [Outils](/docs/tools).

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

Lève une `TypeError` pour un nom invalide ou déjà pris, ou pour un schéma sans prise en charge du JSON Schema.

## server.resource(uri, config)

Enregistre une ressource, ou un template de ressource quand `uri` contient des `{variables}`. Renvoie le serveur. Voir [Ressources](/docs/resources).

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

Enregistre un prompt et renvoie le serveur. Voir [Prompts](/docs/prompts).

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

Exécute un outil dans le processus et renvoie son `CallToolResult`. Vérifié au typage quand les outils ont été enregistrés en chaîne. Rejette la promesse pour un nom d’outil inconnu. Voir [Tests](/docs/testing).

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

Démarre le serveur en stdio, ou en Streamable HTTP quand `http` est défini. Voir [Transports](/docs/transports).

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Handler Streamable HTTP conforme aux standards du Web. Lié au serveur : on peut le passer comme une simple valeur.

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

Traite un message JSON-RPC ou un lot. Renvoie la réponse, ou `undefined` pour les notifications.

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

Le second argument de chaque handler.

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## Helpers de contenu

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` est du base64 ou des octets bruts. Les octets sont encodés pour vous, sur tous les runtimes.

## withJsonSchema(schema, jsonSchema, output?)

Joint un JSON Schema à un Standard Schema qui ne sait pas en générer. Voir [Schémas](/docs/schemas).

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

Levez-la dans un handler pour répondre avec une erreur JSON-RPC plutôt qu’avec un résultat.

```ts
new McpError(code: number, message: string, data?: unknown);
```

| Code | Signification |
| --- | --- |
| `-32602` | Paramètres invalides |
| `-32002` | Ressource introuvable |
| `-32000` à `-32099` | Libres pour les erreurs propres à votre serveur |

## PROTOCOL_VERSIONS

Les versions du protocole MCP que parle picomcp, de la plus récente à la plus ancienne : `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`.

## Helpers de types

| Type | Description |
| --- | --- |
| `Infer<S>` | Type de sortie d’un schéma |
| `InferInput<S>` | Type d’entrée d’un schéma |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | L’interface Standard Schema, intégrée |
