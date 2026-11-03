---
title: Схемы
description: Zod, Valibot, ArkType или любая библиотека Standard Schema, и как генерируется JSON Schema.
group: Руководства
---

# Схемы

В picomcp нет встроенной библиотеки схем. Он принимает любую библиотеку, которая реализует [Standard Schema](https://standardschema.dev), и генерирует нужную MCP-клиентам JSON Schema через [Standard JSON Schema](https://standardschema.dev/json-schema). Вы продолжаете пользоваться привычной библиотекой, а picomcp остаётся маленьким.

## Zod 4

Работает без дополнительных шагов:

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

Работает без дополнительных шагов:

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

В Valibot поддержка JSON Schema вынесена в отдельный пакет. Оберните схему в `toStandardJsonSchema`:

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## Любая другая библиотека

Если библиотека проверяет данные через Standard Schema, но не умеет генерировать JSON Schema (например, Zod 3), добавьте схему сами через `withJsonSchema`:

```ts
import { withJsonSchema } from "picomcp";

server.tool("forecast", {
  input: withJsonSchema(schema, {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  }),
  run: ({ city }) => getForecast(city),
});
```

Без этого регистрация инструмента выбросит ошибку, которая скажет ровно это. Проблема никогда не дойдёт до клиента.

## Как передаются типы

- `run` получает **выходной** тип схемы, после значений по умолчанию и преобразований.
- `server.call()` принимает **входной** тип схемы, поэтому в тестах поля со значением по умолчанию необязательны.
- Если задана схема `output`, `run` должен возвращать её входной тип.

## Советы: схемы, понятные моделям

- Описывайте каждое поле. Описания — это документация, которую читает модель.
- Используйте enum вместо свободного текста, если набор значений известен.
- Задавайте значения по умолчанию для необязательного поведения, чтобы модель могла не указывать аргументы.
- Делайте объекты плоскими. Глубоко вложенные аргументы моделям заполнять труднее.
