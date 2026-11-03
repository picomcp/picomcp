---
title: Testen
description: Tools im selben Prozess mit vollen Typen testen, dann das Protokoll Ende zu Ende.
group: Anleitungen
---

# Testen

## Tools im selben Prozess aufrufen

`server.call(name, input)` führt ein Tool genau so aus, wie es ein Client täte, ohne Transport und ohne Unterprozess. Validierung, Standardwerte, Ausgabeprüfung und Fehlerbehandlung greifen alle.

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

Das funktioniert mit jedem Test-Runner: Vitest, `node:test`, `bun test`, `deno test`.

## Typgeprüfte Aufrufe

Werden Tools verkettet registriert, kennt `call` ihre Namen und Eingaben:

```ts
const server = pico({ name: "weather" }).tool("forecast", {
  input: z.object({ city: z.string(), days: z.number().default(3) }),
  run: ({ city, days }) => `${city}: ${days} days`,
});

server.call("forecast", { city: "Lyon" }); // ✓ days is optional: it has a default
server.call("forecast", {});               // ✗ city is missing
server.call("forcast", { city: "Lyon" });  // ✗ no tool named forcast
```

Registrierst du Tools in getrennten Anweisungen, kann der Typ von `server` ihnen nicht folgen, und `call` akzeptiert jeden Namen. Verkette die Aufrufe oder weise neu zu: `const app = server.tool(...)`.

## Das Protokoll testen

`server.handle` nimmt rohes JSON-RPC entgegen. Das ist praktisch, um Listen und Schemas zu prüfen:

```ts
const res = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
expect(res).toMatchSnapshot();
```

Ein Snapshot von `tools/list` zeigt dir mit wenig Aufwand, wenn eine Schemaänderung verändert, was Modelle sehen.

## Mit einem echten Client testen

Für Ende-zu-Ende-Tests steuerst du den Server mit dem offiziellen SDK-Client über HTTP:

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

Die Testsuite von picomcp macht genau das, über stdio und über HTTP.
