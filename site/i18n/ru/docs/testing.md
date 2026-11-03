---
title: Тестирование
description: Тестируйте инструменты прямо в процессе с полной типизацией, затем проверяйте протокол целиком.
group: Руководства
---

# Тестирование

## Вызов инструментов в процессе

`server.call(name, input)` выполняет инструмент так же, как это сделал бы клиент, но без транспорта и дочернего процесса. Проверка входных данных, значения по умолчанию, проверка вывода и обработка ошибок работают как обычно.

```ts
import { describe, expect, it } from "vitest";
import { server } from "./server.ts";

describe("forecast", () => {
  it("returns the forecast", async () => {
    const result = await server.call("forecast", { city: "Lyon" });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ city: "Lyon" });
  });

  it("explains invalid input to the model", async () => {
    const result = await server.call("forecast", { city: "Lyon", days: 30 });
    expect(result.isError).toBe(true);
  });
});
```

Это работает с любым тест-раннером: Vitest, `node:test`, `bun test`, `deno test`.

## Вызовы с проверкой типов

Если инструменты зарегистрированы цепочкой, `call` знает их имена и входные данные:

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

Если регистрировать инструменты отдельными инструкциями, тип `server` не сможет их отследить, и `call` примет любое имя. Используйте цепочку вызовов или переприсваивание: `const app = server.tool(...)`.

## Тестирование протокола

`server.handle` принимает сырой JSON-RPC. Это удобно для проверки списков и схем:

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

Снапшот `tools/list` — простой способ заметить, что изменение схемы поменяло то, что видят модели.

## Тестирование с настоящим клиентом

Для сквозных тестов управляйте сервером через клиент официального SDK по HTTP:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const running = await server.serve({ http: { port: 0 } });
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(running.url!)));

const { tools } = await client.listTools();

await client.close();
await running.close();
```

Собственные тесты picomcp делают именно это, через stdio и через HTTP.
