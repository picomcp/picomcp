---
title: Tests
description: Tester les outils dans le processus avec les types complets, puis tester le protocole de bout en bout.
group: Guides
---

# Tests

## Appeler les outils dans le processus

`server.call(name, input)` exécute un outil exactement comme le ferait un client, sans transport ni sous-processus. La validation, les valeurs par défaut, la vérification de la sortie et la gestion des erreurs s’appliquent toutes.

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

Cela fonctionne avec n’importe quel lanceur de tests : Vitest, `node:test`, `bun test`, `deno test`.

## Des appels vérifiés au typage

Quand les outils sont enregistrés en chaîne, `call` connaît leurs noms et leurs entrées :

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

Si vous enregistrez les outils dans des instructions séparées, le type de `server` ne peut pas les suivre et `call` accepte n’importe quel nom. Enchaînez les appels, ou réassignez : `const app = server.tool(...)`.

## Tester le protocole

`server.handle` prend du JSON-RPC brut, ce qui est pratique pour vérifier les listes et les schémas :

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

Un snapshot de `tools/list` est un moyen simple de remarquer quand un changement de schéma modifie ce que voient les modèles.

## Tester avec un vrai client

Pour des tests de bout en bout, pilotez le serveur avec le client du SDK officiel, en HTTP :

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

La suite de tests de picomcp fait exactement cela, en stdio comme en HTTP.
