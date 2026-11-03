---
title: Tests
description: Probar las herramientas en el mismo proceso con tipos completos, y después el protocolo de extremo a extremo.
group: Guías
---

# Tests

## Llamar a las herramientas en el mismo proceso

`server.call(name, input)` ejecuta una herramienta exactamente como lo haría un cliente, sin transporte ni subproceso. Se aplican la validación, los valores por defecto, la comprobación de la salida y la gestión de errores.

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

Funciona con cualquier ejecutor de tests: Vitest, `node:test`, `bun test`, `deno test`.

## Llamadas comprobadas por los tipos

Cuando las herramientas se registran encadenadas, `call` conoce sus nombres y entradas:

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

Si registras las herramientas en sentencias separadas, el tipo de `server` no puede seguirlas y `call` acepta cualquier nombre. Encadena las llamadas o reasigna: `const app = server.tool(...)`.

## Probar el protocolo

`server.handle` recibe JSON-RPC en bruto, lo que viene bien para comprobar listados y esquemas:

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

Un snapshot de `tools/list` es una forma barata de notar cuándo un cambio de esquema altera lo que ven los modelos.

## Probar con un cliente real

Para tests de extremo a extremo, controla el servidor con el cliente del SDK oficial por HTTP:

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

La propia suite de tests de picomcp hace exactamente esto, por stdio y por HTTP.
