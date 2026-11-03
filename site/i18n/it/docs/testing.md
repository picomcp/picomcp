---
title: Test
description: Testare i tool nel processo con i tipi completi, poi testare il protocollo da un capo all’altro.
group: Guide
---

# Test

## Chiamare i tool nel processo

`server.call(name, input)` esegue un tool esattamente come farebbe un client, senza trasporto né sottoprocesso. Validazione, valori predefiniti, controllo dell’output e gestione degli errori si applicano tutti.

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

Funziona con qualsiasi test runner: Vitest, `node:test`, `bun test`, `deno test`.

## Chiamate controllate dai tipi

Quando i tool sono registrati in catena, `call` ne conosce nomi e input:

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

Se registri i tool in istruzioni separate, il tipo di `server` non può seguirli e `call` accetta qualsiasi nome. Concatena le chiamate, oppure riassegna: `const app = server.tool(...)`.

## Testare il protocollo

`server.handle` accetta JSON-RPC grezzo, utile per controllare elenchi e schemi:

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

Uno snapshot di `tools/list` è un modo economico per accorgersi quando una modifica a uno schema cambia ciò che vedono i modelli.

## Testare con un client vero

Per i test end-to-end, pilota il server con il client dell’SDK ufficiale via HTTP:

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

La suite di test di picomcp fa esattamente questo, sia via stdio sia via HTTP.
