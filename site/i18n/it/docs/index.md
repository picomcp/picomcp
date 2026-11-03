---
title: Introduzione
description: Cos’è picomcp, cosa non è, e le dieci righe che lo spiegano.
group: Per iniziare
---

# Introduzione

picomcp è un framework TypeScript per costruire server [Model Context Protocol](https://modelcontextprotocol.io). Un server MCP dà a un’applicazione di IA (Claude, Cursor, VS Code, il tuo agente) dei **tool** da chiamare, delle **risorse** da leggere e dei **prompt** da proporre all’utente.

```ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve();
```

Questo è un server completo. Avvialo con `node server.ts` e collegalo a qualsiasi client MCP.

## Perché picomcp

- **Piccolo.** Circa 4 kB compresso con gzip, zero dipendenze. L’intera libreria ti sta in testa e in una code review.
- **Tipizzato dal tuo schema.** Passa uno schema Zod, Valibot o ArkType. Il tuo handler riceve argomenti tipizzati, il client riceve un JSON Schema, le chiamate non valide ricevono un errore leggibile.
- **Gira ovunque.** Node 22+, Bun, Deno, Cloudflare Workers e qualsiasi runtime con `fetch`. Nessun modulo integrato di Node nel nucleo.
- **Due trasporti, un solo server.** stdio per i client desktop, Streamable HTTP per i server remoti. Si passa dall’uno all’altro con un’opzione.
- **Testabile senza client.** `server.call("forecast", { city: "Lyon" })` esegue un tool nel processo, completamente tipizzato.
- **Verificato con l’SDK ufficiale.** La suite di test pilota picomcp con `@modelcontextprotocol/sdk` su entrambi i trasporti.

## Cosa non è picomcp

picomcp implementa il lato server di MCP e nient’altro. Non include un client, un ciclo di agente né un SDK per LLM. Privilegia la metà senza stato, a richiesta/risposta, del protocollo: quella che serve alla maggior parte dei server. Le funzionalità avviate dal server, come sampling ed elicitation, non sono ancora supportate: l’elenco esatto è in [Copertura del protocollo](/docs/protocol).

## Prossimi passi

- [Avvio rapido](/docs/quickstart): costruisci e collega un server in cinque minuti.
- [Tool](/docs/tools): tutto quello che un tool sa fare.
- [Per gli agenti IA](/docs/agents): dai la documentazione al tuo agente di programmazione con un solo URL.
