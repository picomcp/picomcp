---
title: Avvio rapido
description: Crea, testa e collega il tuo primo server MCP in cinque minuti.
group: Per iniziare
---

# Avvio rapido

Ti serve Node 22.18 o successivo (esegue direttamente i file TypeScript), Bun o Deno.

## Crea un progetto

```sh
npx picomcp init my-server
cd my-server
npm install
```

Ottieni un server pronto all’uso:

| File | Scopo |
| --- | --- |
| `server.ts` | La definizione del server: tool, risorse, prompt |
| `main.ts` | Avvia il server su stdio |
| `server.test.ts` | Un test che chiama un tool nel processo |

Preferisci partire da zero? Installa i due pacchetti e scrivi `server.ts` da solo:

```sh
npm install picomcp zod
```

## Scrivi un tool

Apri `server.ts`:

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

- `description` è ciò che il modello legge per decidere quando chiamare il tool. Scrivila per il modello.
- `input` è qualsiasi [Standard Schema](/docs/schemas). Dentro `run`, `name` è tipizzato come `string`.
- Qui `run` restituisce una stringa. Può anche restituire oggetti, blocchi di contenuto o lanciare un errore: vedi [Tool](/docs/tools).

## Testalo

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

`server.call` è controllato dal sistema di tipi: un refuso nel nome del tool o un argomento mancante non compila.

## Collegalo

Per Claude Code:

```sh
claude mcp add my-server -- node /absolute/path/to/my-server/main.ts
```

Poi chiedi a Claude di salutare qualcuno. Per Claude Desktop, Cursor, VS Code e altri, vedi [Collegare un client](/docs/clients).

## Ispezionalo

MCP Inspector ti permette di chiamare i tool a mano e vedere i messaggi grezzi:

```sh
npx @modelcontextprotocol/inspector node main.ts
```
