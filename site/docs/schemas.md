---
title: Schemas
description: Use Zod, Valibot, ArkType or any Standard Schema library, and how JSON Schema is generated.
group: Guides
---

# Schemas

picomcp does not ship a schema library. It accepts any library that implements [Standard Schema](https://standardschema.dev), and generates the JSON Schema that MCP clients need through [Standard JSON Schema](https://standardschema.dev/json-schema). You keep the library you already use, and picomcp stays small.

## Zod 4

Works as is:

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

Works as is:

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot keeps JSON Schema support in a separate package. Wrap the schema with `toStandardJsonSchema`:

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## Any other library

If a library validates through Standard Schema but cannot produce JSON Schema (Zod 3, for example), attach one yourself with `withJsonSchema`:

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

Without it, registering the tool throws an error that tells you exactly this, so the problem never reaches a client.

## How types flow

- `run` receives the schema's **output** type, after defaults and transforms.
- `server.call()` accepts the schema's **input** type, so fields with defaults are optional in tests.
- With an `output` schema, `run` must return the schema's input type.

## Tips for schemas models understand

- Describe every field. Descriptions are the documentation the model reads.
- Prefer enums to free text when the set of values is known.
- Use defaults for optional behaviour so the model can omit arguments.
- Keep objects flat. Deeply nested arguments are harder for models to fill in.
