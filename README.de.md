<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — MCP-Server im Pico-Format." src=".github/assets/banner-light.svg" width="100%">
</picture>

<p>
  <a href="https://www.npmjs.com/package/picomcp"><img alt="npm" src="https://img.shields.io/npm/v/picomcp?style=flat-square&color=1d3bff&label=npm"></a>
  <a href="https://jsr.io/@picomcp/picomcp"><img alt="JSR" src="https://img.shields.io/jsr/v/@picomcp/picomcp?style=flat-square&color=1d3bff&label=jsr"></a>
  <a href="https://github.com/picomcp/picomcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/picomcp/picomcp/ci.yml?branch=main&style=flat-square&label=ci"></a>
  <img alt="gzip size" src="https://img.shields.io/badge/gzip-3.9%20kB-1d3bff?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-1d3bff?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0f1f?style=flat-square"></a>
  <a href="https://deepwiki.com/picomcp/picomcp"><img alt="Ask DeepWiki" src="https://img.shields.io/badge/ask-DeepWiki-1d3bff?style=flat-square"></a>
</p>

<p><a href="README.md">English</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md"><b>Deutsch</b></a> · <a href="README.it.md">Italiano</a> · <a href="README.es.md">Español</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a></p>

**picomcp** ist ein TypeScript-Framework ohne Abhängigkeiten für [Model-Context-Protocol](https://modelcontextprotocol.io)-Server. Gib jedem LLM echte Tools in einer einzigen Datei: typisiert mit deiner Schema-Bibliothek, über stdio oder HTTP, auf Node, Bun, Deno und am Edge.

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

Das ist ein vollständiger Server. **[Zur Doku →](https://picomcp.github.io/picomcp/de/docs/)**

## Warum picomcp

|  |  |
| --- | --- |
| **3,9 kB gzip, 0 Abhängigkeiten** | Klein genug, um es in einem Rutsch zu lesen und in einem Review zu prüfen. Ein Größenbudget in der CI sorgt dafür, dass es so bleibt. |
| **Typisiert aus deinem Schema** | Zod 4, ArkType und Valibot über [Standard Schema](https://standardschema.dev). Typisierte Handler, generiertes JSON Schema, lesbare Validierungsfehler, mit denen das Modell etwas anfangen kann. |
| **Läuft überall** | Node 22+, Bun, Deno, Cloudflare Workers. Der Kern nutzt nur Web-APIs, keine Node-Module. |
| **stdio und Streamable HTTP** | Derselbe Server, eine Option Unterschied. Dazu ein standardkonformer `fetch`-Handler für Hono, Next.js, Workers und Co. |
| **Testbar ohne Client** | `server.call("forecast", { city: "Lyon" })` führt ein Tool im selben Prozess aus, mit typgeprüften Namen und Argumenten. |
| **Mit dem offiziellen SDK geprüft** | Die Testsuite steuert picomcp mit `@modelcontextprotocol/sdk` über beide Transporte. |

## Installation

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

Oder leg ein Projekt mit Server, Einstiegspunkt und Test an:

```sh
npx picomcp init my-server
```

## Ein Rundgang in fünf Snippets

**Tools** sind Funktionen, die das Modell aufruft. Gib einen String, ein Objekt oder Medien zurück, oder wirf einen Fehler:

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

**Strukturierte Ausgabe** wird validiert und als `structuredContent` gesendet:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

**Ressourcen** nutzen URI-Templates, deren Variablen aus dem String typisiert werden:

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

**Prompts** werden in Clients zu Slash-Befehlen:

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

**Transporte** sind jeweils eine Zeile:

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## Client verbinden

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Konfigurationen für Claude Desktop, Cursor und VS Code findest du unter [Client verbinden](https://picomcp.github.io/picomcp/de/docs/clients).

## Testen

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## Doku für Menschen und Agenten

Die [Dokumentation](https://picomcp.github.io/picomcp/de/docs/) hat eine fehlertolerante Suche auf <kbd>⌘</kbd> <kbd>K</kbd>, ist in 8 Sprachen verfügbar, und jede Seite wird auch für KI-Agenten veröffentlicht:

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt): ein Index aller Seiten
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt): die gesamte Dokumentation in einer Datei
- `docs/<page>.md`: jede Seite als Markdown
- [`picomcp-docs`](packages/docs): die Doku als MCP-Server, gebaut mit picomcp. `claude mcp add picomcp-docs -- npx -y picomcp-docs`

## Umfang

picomcp ist die Serverhälfte von MCP, gebaut für das zustandslose Request/Response-Modell, das die meisten Server brauchen. Es deckt Lebenszyklus, Tools (mit strukturierter Ausgabe und Annotationen), Ressourcen und Templates, Prompts, Abbruch und beide Transporte ab.

Noch nicht unterstützt werden Funktionen, bei denen der Server von sich aus Nachrichten an den Client schickt: Sampling, Elicitation, Roots, Log- und Fortschrittsbenachrichtigungen, Abonnements. Wenn du die heute brauchst, nimm das offizielle [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk). Die vollständige Liste steht unter [Protokollabdeckung](https://picomcp.github.io/picomcp/de/docs/protocol).

## Mitmachen

Issues und Pull Requests sind willkommen. Lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md), dann:

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

Du arbeitest mit einem Coding-Agenten? Er findet seine Anweisungen in [AGENTS.md](AGENTS.md).

## Lizenz

[MIT](LICENSE)
