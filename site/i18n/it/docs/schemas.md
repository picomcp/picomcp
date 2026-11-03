---
title: Schemi
description: Usare Zod, Valibot, ArkType o qualsiasi libreria Standard Schema, e come viene generato il JSON Schema.
group: Guide
---

# Schemi

picomcp non include una libreria di schemi. Accetta qualsiasi libreria che implementi [Standard Schema](https://standardschema.dev) e genera il JSON Schema di cui hanno bisogno i client MCP tramite [Standard JSON Schema](https://standardschema.dev/json-schema). Tieni la libreria che già usi, e picomcp resta piccolo.

## Zod 4

Funziona così com’è:

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

Funziona così com’è:

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot tiene il supporto al JSON Schema in un pacchetto separato. Avvolgi lo schema con `toStandardJsonSchema`:

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## Qualsiasi altra libreria

Se una libreria valida tramite Standard Schema ma non sa produrre un JSON Schema (Zod 3, per esempio), aggiungine uno tu con `withJsonSchema`:

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

Senza, la registrazione del tool lancia un errore che ti dice esattamente questo: il problema non arriva mai a un client.

## Come scorrono i tipi

- `run` riceve il tipo di **output** dello schema, dopo valori predefiniti e trasformazioni.
- `server.call()` accetta il tipo di **input** dello schema, quindi nei test i campi con un valore predefinito sono facoltativi.
- Con uno schema `output`, `run` deve restituire il tipo di input di quello schema.

## Consigli per schemi che i modelli capiscono

- Descrivi ogni campo. Le descrizioni sono la documentazione che legge il modello.
- Preferisci gli enum al testo libero quando l’insieme dei valori è noto.
- Usa valori predefiniti per i comportamenti facoltativi, così il modello può omettere quegli argomenti.
- Tieni gli oggetti piatti. Gli argomenti molto annidati sono più difficili da compilare per un modello.
