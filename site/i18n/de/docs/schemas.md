---
title: Schemas
description: Zod, Valibot, ArkType oder jede Standard-Schema-Bibliothek verwenden, und wie das JSON Schema entsteht.
group: Anleitungen
---

# Schemas

picomcp bringt keine Schema-Bibliothek mit. Es akzeptiert jede Bibliothek, die [Standard Schema](https://standardschema.dev) implementiert, und erzeugt das JSON Schema, das MCP-Clients brauchen, über [Standard JSON Schema](https://standardschema.dev/json-schema). Du behältst die Bibliothek, die du schon nutzt, und picomcp bleibt klein.

## Zod 4

Funktioniert direkt:

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

Funktioniert direkt:

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot hält die JSON-Schema-Unterstützung in einem eigenen Paket. Umschließe das Schema mit `toStandardJsonSchema`:

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## Jede andere Bibliothek

Validiert eine Bibliothek über Standard Schema, kann aber kein JSON Schema erzeugen (zum Beispiel Zod 3), hängst du selbst eines mit `withJsonSchema` an:

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

Ohne das wirft die Registrierung des Tools einen Fehler, der genau das sagt. Das Problem erreicht also nie einen Client.

## Wie die Typen fließen

- `run` bekommt den **Ausgabetyp** des Schemas, nach Standardwerten und Transformationen.
- `server.call()` akzeptiert den **Eingabetyp** des Schemas, daher sind Felder mit Standardwert in Tests optional.
- Mit einem `output`-Schema muss `run` dessen Eingabetyp zurückgeben.

## Tipps für Schemas, die Modelle verstehen

- Beschreibe jedes Feld. Die Beschreibungen sind die Dokumentation, die das Modell liest.
- Bevorzuge Enums gegenüber Freitext, wenn die möglichen Werte bekannt sind.
- Nutze Standardwerte für optionales Verhalten, damit das Modell Argumente weglassen kann.
- Halte Objekte flach. Tief verschachtelte Argumente fallen Modellen schwerer.
