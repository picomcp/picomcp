---
title: Schémas
description: Utiliser Zod, Valibot, ArkType ou toute bibliothèque Standard Schema, et comment le JSON Schema est généré.
group: Guides
---

# Schémas

picomcp n’embarque pas de bibliothèque de schémas. Il accepte toute bibliothèque qui implémente [Standard Schema](https://standardschema.dev), et génère le JSON Schema dont les clients MCP ont besoin via [Standard JSON Schema](https://standardschema.dev/json-schema). Vous gardez la bibliothèque que vous utilisez déjà, et picomcp reste léger.

## Zod 4

Fonctionne tel quel :

```ts
import { z } from "zod";

server.tool("forecast", {
  input: z.object({ city: z.string().describe("City name") }),
  run: ({ city }) => getForecast(city),
});
```

## ArkType

Fonctionne tel quel :

```ts
import { type } from "arktype";

server.tool("forecast", {
  input: type({ city: "string" }),
  run: ({ city }) => getForecast(city),
});
```

## Valibot

Valibot garde la prise en charge du JSON Schema dans un paquet séparé. Enveloppez le schéma avec `toStandardJsonSchema` :

```ts
import * as v from "valibot";
import { toStandardJsonSchema } from "@valibot/to-json-schema";

server.tool("forecast", {
  input: toStandardJsonSchema(v.object({ city: v.string() })),
  run: ({ city }) => getForecast(city),
});
```

## Toute autre bibliothèque

Si une bibliothèque valide via Standard Schema mais ne sait pas produire de JSON Schema (Zod 3, par exemple), joignez-en un vous-même avec `withJsonSchema` :

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

Sans cela, l’enregistrement de l’outil lève une erreur qui vous dit exactement ceci : le problème n’atteint jamais un client.

## Comment circulent les types

- `run` reçoit le type de **sortie** du schéma, après valeurs par défaut et transformations.
- `server.call()` accepte le type d’**entrée** du schéma : les champs qui ont une valeur par défaut sont facultatifs dans les tests.
- Avec un schéma `output`, `run` doit renvoyer le type d’entrée de ce schéma.

## Conseils pour des schémas que les modèles comprennent

- Décrivez chaque champ. Les descriptions sont la documentation que lit le modèle.
- Préférez les enums au texte libre quand l’ensemble des valeurs est connu.
- Utilisez des valeurs par défaut pour les comportements facultatifs : le modèle peut omettre ces arguments.
- Gardez des objets plats. Les arguments très imbriqués sont plus difficiles à remplir pour un modèle.
