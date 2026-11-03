---
title: Schnellstart
description: In fünf Minuten deinen ersten MCP-Server anlegen, testen und verbinden.
group: Erste Schritte
---

# Schnellstart

Du brauchst Node 22.18 oder neuer (es führt TypeScript-Dateien direkt aus), Bun oder Deno.

## Projekt anlegen

```sh
npx picomcp init my-server
cd my-server
npm install
```

Damit bekommst du einen lauffähigen Server:

| Datei | Zweck |
| --- | --- |
| `server.ts` | Deine Serverdefinition: Tools, Ressourcen, Prompts |
| `main.ts` | Startet den Server über stdio |
| `server.test.ts` | Ein Test, der ein Tool im selben Prozess aufruft |

Lieber bei null anfangen? Installiere die beiden Pakete und schreibe `server.ts` selbst:

```sh
npm install picomcp zod
```

## Ein Tool schreiben

Öffne `server.ts`:

```ts
import { pico } from "picomcp";
import { z } from "zod";

export const server = pico({ name: "my-server", version: "0.1.0" })
  .tool("greet", {
    description: "Greets someone by name.",
    input: z.object({ name: z.string().describe("Who to greet") }),
    run: ({ name }) => `Hello, ${name}!`,
  });
```

- `description` liest das Modell, um zu entscheiden, wann es das Tool aufruft. Schreib sie für das Modell.
- `input` ist ein beliebiges [Standard Schema](/docs/schemas). In `run` ist `name` als `string` typisiert.
- Hier gibt `run` einen String zurück. Es kann auch Objekte oder Inhaltsblöcke zurückgeben oder einen Fehler werfen: siehe [Tools](/docs/tools).

## Testen

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { server } from "./server.ts";

test("greet says hello", async () => {
  const result = await server.call("greet", { name: "Ada" });
  assert.deepEqual(result.content, [{ type: "text", text: "Hello, Ada!" }]);
});
```

```sh
npm test
```

`server.call` wird vom Typsystem geprüft: Ein Tippfehler im Tool-Namen oder ein fehlendes Argument lässt sich nicht kompilieren.

## Verbinden

Für Claude Code:

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

Bitte Claude dann, jemanden zu begrüßen. Für Claude Desktop, Cursor, VS Code und andere siehe [Client verbinden](/docs/clients).

## Untersuchen

Mit dem MCP Inspector rufst du Tools von Hand auf und siehst die rohen Nachrichten:

```sh
npx @modelcontextprotocol/inspector node main.ts
```
