---
title: Schema
description: 使用 Zod、Valibot、ArkType 或任何 Standard Schema 库，以及 JSON Schema 是如何生成的。
group: 指南
---

# Schema

picomcp 不自带 schema 库。它接受任何实现了 [Standard Schema](https://standardschema.dev) 的库，并通过 [Standard JSON Schema](https://standardschema.dev/json-schema) 生成 MCP 客户端需要的 JSON Schema。你可以继续用自己熟悉的库，picomcp 也能保持小巧。

## Zod 4

直接可用：

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

直接可用：

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot 把 JSON Schema 支持放在单独的包里。用 `toStandardJsonSchema` 包装 schema：

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## 其他任何库

如果某个库通过 Standard Schema 做校验，但无法生成 JSON Schema（比如 Zod 3），请用 `withJsonSchema` 自己附上一份：

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

否则，注册工具时会抛出错误，并明确告诉你这一点，问题永远不会传到客户端。

## 类型如何流转

- `run` 拿到的是 schema 的**输出**类型，即应用默认值和转换之后的类型。
- `server.call()` 接受 schema 的**输入**类型，所以在测试中，带默认值的字段是可选的。
- 声明了 `output` schema 后，`run` 必须返回该 schema 的输入类型。

## 让模型读懂 schema 的建议

- 描述每个字段。这些描述就是模型读到的文档。
- 值的范围已知时，用枚举代替自由文本。
- 可选行为用默认值表达，这样模型可以省略这些参数。
- 让对象保持扁平。嵌套很深的参数，模型更难填写正确。
