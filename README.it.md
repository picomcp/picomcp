<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — server MCP in scala pico." src=".github/assets/banner-light.svg" width="100%">
</picture>

<p>
  <a href="https://www.npmjs.com/package/picomcp"><img alt="npm" src="https://img.shields.io/npm/v/picomcp?style=flat-square&color=1d3bff&label=npm"></a>
  <a href="https://jsr.io/@picomcp/picomcp"><img alt="JSR" src="https://img.shields.io/jsr/v/@picomcp/picomcp?style=flat-square&color=1d3bff&label=jsr"></a>
  <a href="https://github.com/picomcp/picomcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/picomcp/picomcp/ci.yml?branch=main&style=flat-square&label=ci"></a>
  <img alt="gzip size" src="https://img.shields.io/badge/gzip-3.9%20kB-1d3bff?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-1d3bff?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0f1f?style=flat-square"></a>
</p>

<p><a href="README.md">English</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md"><b>Italiano</b></a> · <a href="README.es.md">Español</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a></p>

**picomcp** è un framework TypeScript senza dipendenze per server [Model Context Protocol](https://modelcontextprotocol.io). Dai strumenti veri a qualsiasi LLM in un solo file: tipizzato dalla tua libreria di schemi, servito via stdio o HTTP, su Node, Bun, Deno e l’edge.

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

Questo è un server completo. **[Leggi la documentazione →](https://picomcp.github.io/picomcp/it/docs/)**

## Perché picomcp

|  |  |
| --- | --- |
| **3,9 kB con gzip, 0 dipendenze** | Abbastanza piccolo da leggerlo tutto d’un fiato e da verificarlo in una sola review. Un budget di dimensione nella CI lo mantiene tale. |
| **Tipizzato dal tuo schema** | Zod 4, ArkType e Valibot tramite [Standard Schema](https://standardschema.dev). Handler tipizzati, JSON Schema generato, errori di validazione leggibili su cui il modello può agire. |
| **Gira ovunque** | Node 22+, Bun, Deno, Cloudflare Workers. Il nucleo usa solo API Web: nessun modulo integrato di Node. |
| **stdio e Streamable HTTP** | Lo stesso server, un’opzione di differenza. In più un handler `fetch` standard per Hono, Next.js, Workers e compagnia. |
| **Testabile senza client** | `server.call("forecast", { city: "Lyon" })` esegue un tool nel processo, con nomi e argomenti controllati dai tipi. |
| **Verificato con l’SDK ufficiale** | La suite di test pilota picomcp con `@modelcontextprotocol/sdk` su entrambi i trasporti. |

## Installazione

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

Oppure crea un progetto con un server, un punto di ingresso e un test:

```sh
npx picomcp init my-server
```

## Un giro in cinque snippet

I **tool** sono funzioni che il modello chiama. Restituisci una stringa, un oggetto, dei media, oppure lancia un errore:

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

L’**output strutturato** viene validato e inviato come `structuredContent`:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

Le **risorse** usano template di URI le cui variabili sono tipizzate dalla stringa:

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

I **prompt** diventano comandi slash nei client:

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

I **trasporti** sono una riga ciascuno:

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## Collegare un client

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Le configurazioni per Claude Desktop, Cursor e VS Code sono in [Collegare un client](https://picomcp.github.io/picomcp/it/docs/clients).

## Testarlo

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## Documentazione per persone e agenti

La [documentazione](https://picomcp.github.io/picomcp/it/docs/) ha una ricerca che tollera i refusi su <kbd>⌘</kbd> <kbd>K</kbd>, è disponibile in 8 lingue, e ogni pagina è pubblicata anche per gli agenti IA:

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt): un indice di tutte le pagine
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt): tutta la documentazione in un unico file
- `docs/<page>.md`: qualsiasi pagina in Markdown
- [`picomcp-docs`](packages/docs): la documentazione come server MCP, costruito con picomcp. `claude mcp add picomcp-docs -- npx -y picomcp-docs`

## Ambito

picomcp è la metà server di MCP, pensata per il modello richiesta/risposta senza stato di cui ha bisogno la maggior parte dei server. Copre ciclo di vita, tool (con output strutturato e annotazioni), risorse e template, prompt, annullamento ed entrambi i trasporti.

Non supporta ancora le funzionalità in cui il server deve scrivere al client di propria iniziativa: sampling, elicitation, roots, notifiche di log e di avanzamento, sottoscrizioni. Se ti servono oggi, usa l’SDK ufficiale [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk). L’elenco completo è in [Copertura del protocollo](https://picomcp.github.io/picomcp/it/docs/protocol).

## Contribuire

Issue e pull request sono benvenute. Leggi prima [CONTRIBUTING.md](CONTRIBUTING.md), poi:

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

Lavori con un agente di programmazione? Troverà le sue istruzioni in [AGENTS.md](AGENTS.md).

## Licenza

[MIT](LICENSE)
