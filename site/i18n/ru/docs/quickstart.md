---
title: Быстрый старт
description: Создайте, протестируйте и подключите свой первый MCP-сервер за пять минут.
group: Начало работы
---

# Быстрый старт

Вам понадобится Node 22.18 или новее (он запускает файлы TypeScript напрямую), Bun или Deno.

## Создание проекта

```sh
npx picomcp init my-server
cd my-server
npm install
```

Вы получите готовый к запуску сервер:

| Файл | Назначение |
| --- | --- |
| `server.ts` | Описание сервера: инструменты, ресурсы, промпты |
| `main.ts` | Запускает сервер через stdio |
| `server.test.ts` | Тест, который вызывает инструмент прямо в процессе |

Хотите начать с нуля? Установите два пакета и напишите `server.ts` сами:

```sh
npm install picomcp zod
```

## Пишем инструмент

Откройте `server.ts`:

```ts
import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: "my-server", version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => `Hello, ${name}!`,
  });
```

- `description` модель читает, чтобы решить, когда вызывать инструмент. Пишите её для модели.
- `input` — любая [Standard Schema](/docs/schemas). Внутри `run` поле `name` имеет тип `string`.
- Здесь `run` возвращает строку. Он может также возвращать объекты, блоки содержимого или выбрасывать ошибку: см. [Инструменты](/docs/tools).

## Тестируем

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
```

```sh
npm test
```

`server.call` проверяется системой типов: опечатка в имени инструмента или пропущенный аргумент не скомпилируются.

## Подключаем

Для Claude Code:

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

Теперь попросите Claude кого-нибудь поприветствовать. Для Claude Desktop, Cursor, VS Code и других клиентов см. [Подключение клиента](/docs/clients).

## Отладка

MCP Inspector позволяет вызывать инструменты вручную и видеть сырые сообщения:

```sh
npx @modelcontextprotocol/inspector node main.ts
```
