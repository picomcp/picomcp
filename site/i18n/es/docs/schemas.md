---
title: Esquemas
description: Usar Zod, Valibot, ArkType o cualquier librería Standard Schema, y cómo se genera el JSON Schema.
group: Guías
---

# Esquemas

picomcp no incluye una librería de esquemas. Acepta cualquier librería que implemente [Standard Schema](https://standardschema.dev) y genera el JSON Schema que necesitan los clientes MCP mediante [Standard JSON Schema](https://standardschema.dev/json-schema). Sigues usando la librería que ya tienes, y picomcp sigue siendo pequeño.

## Zod 4

Funciona tal cual:

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

Funciona tal cual:

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot tiene el soporte de JSON Schema en un paquete aparte. Envuelve el esquema con `toStandardJsonSchema`:

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## Cualquier otra librería

Si una librería valida mediante Standard Schema pero no puede producir JSON Schema (Zod 3, por ejemplo), añade uno tú con `withJsonSchema`:

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

Sin esto, registrar la herramienta lanza un error que te dice exactamente esto, así que el problema nunca llega a un cliente.

## Cómo fluyen los tipos

- `run` recibe el tipo de **salida** del esquema, después de valores por defecto y transformaciones.
- `server.call()` acepta el tipo de **entrada** del esquema, así que los campos con valor por defecto son opcionales en los tests.
- Con un esquema `output`, `run` debe devolver el tipo de entrada de ese esquema.

## Consejos para esquemas que los modelos entienden

- Describe cada campo. Las descripciones son la documentación que lee el modelo.
- Prefiere enums a texto libre cuando el conjunto de valores es conocido.
- Usa valores por defecto para el comportamiento opcional, así el modelo puede omitir argumentos.
- Mantén los objetos planos. Los argumentos muy anidados son más difíciles de rellenar para un modelo.
