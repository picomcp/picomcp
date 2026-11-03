---
title: Справочник API
description: Все экспорты picomcp с сигнатурами.
group: Справочник
---

# Справочник API

```ts
import { pico, McpError, PROTOCOL_VERSIONS, text, image, audio, link, withJsonSchema } from "picomcp";
import type { Server, ToolConfig, ResourceConfig, PromptConfig, Context, CallToolResult } from "picomcp";
```

## pico(info)

Создаёт сервер.

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

Регистрирует инструмент и возвращает сервер. См. [Инструменты](/docs/tools).

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

Выбрасывает `TypeError` при некорректном или повторяющемся имени, а также для схемы без поддержки JSON Schema.

## server.resource(uri, config)

Регистрирует ресурс или шаблон ресурса, если `uri` содержит `{variables}`. Возвращает сервер. См. [Ресурсы](/docs/resources).

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

Регистрирует промпт и возвращает сервер. См. [Промпты](/docs/prompts).

```ts
interface PromptConfig<A> {
  title?: string;
  description?: string;
  args?: A;                    // Standard Schema of an object with string fields
  run(args: Infer<A>, ctx: Context): string | PromptMessage[] | { description?: string; messages: PromptMessage[] };
}
```

## server.call(name, input?)

Выполняет инструмент в процессе и возвращает его `CallToolResult`. Проверяется системой типов, если инструменты зарегистрированы цепочкой. Для неизвестного имени инструмента промис отклоняется. См. [Тестирование](/docs/testing).

```ts
call(name: string, input?: unknown): Promise<CallToolResult>;

interface CallToolResult {
  content: ContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
```

## server.serve(options?)

Запускает сервер через stdio или через Streamable HTTP, если задан `http`. См. [Транспорты](/docs/transports).

```ts
serve(options?: { http?: number | { port?: number; hostname?: string; path?: string } }): Promise<{ url?: string; close(): Promise<void> }>;
```

## server.fetch(request)

Обработчик Streamable HTTP по веб-стандартам. Привязан к серверу, поэтому его можно передавать как обычное значение.

```ts
fetch(request: Request): Promise<Response>;
```

## server.handle(message)

Обрабатывает одно сообщение JSON-RPC или пакет. Возвращает ответ, а для уведомлений — `undefined`.

```ts
handle(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
```

## Context

Второй аргумент каждого обработчика.

```ts
interface Context {
  signal: AbortSignal;                       // aborted when the client cancels
  meta: Record<string, unknown> | undefined; // the request's _meta
}
```

## Функции для содержимого

```ts
text(text: string, annotations?: Annotations): ContentBlock;
image(data: string | Uint8Array, mimeType: string): ContentBlock;
audio(data: string | Uint8Array, mimeType: string): ContentBlock;
link(uri: string, name: string, extra?: { title?: string; description?: string; mimeType?: string }): ContentBlock;
```

`data` — строка base64 или сырые байты. Байты кодируются автоматически в любой среде.

## withJsonSchema(schema, jsonSchema, output?)

Прикрепляет JSON Schema к Standard Schema, которая не умеет её генерировать. См. [Схемы](/docs/schemas).

```ts
withJsonSchema<S>(schema: S, jsonSchema: JsonSchema, output?: JsonSchema): StandardSchemaV1<InferInput<S>, Infer<S>>;
```

## McpError

Выбросьте её в обработчике, чтобы ответить ошибкой JSON-RPC вместо результата.

```ts
new McpError(code: number, message: string, data?: unknown);
```

| Код | Значение |
| --- | --- |
| `-32602` | Некорректные параметры |
| `-32002` | Ресурс не найден |
| от `-32000` до `-32099` | Свободны для ошибок вашего сервера |

## PROTOCOL_VERSIONS

Версии протокола MCP, которые поддерживает picomcp, от новой к старой: `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`.

## Вспомогательные типы

| Тип | Описание |
| --- | --- |
| `Infer<S>` | Выходной тип схемы |
| `InferInput<S>` | Входной тип схемы |
| `UriParams<"a://{x}/{+y}">` | `{ x: string; y: string }` |
| `StandardSchemaV1` | Интерфейс Standard Schema, встроенный в библиотеку |
