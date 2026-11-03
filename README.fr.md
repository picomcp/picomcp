<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — des serveurs MCP à l’échelle pico." src=".github/assets/banner-light.svg" width="100%">
</picture>

<p>
  <a href="https://www.npmjs.com/package/picomcp"><img alt="npm" src="https://img.shields.io/npm/v/picomcp?style=flat-square&color=1d3bff&label=npm"></a>
  <a href="https://jsr.io/@picomcp/picomcp"><img alt="JSR" src="https://img.shields.io/jsr/v/@picomcp/picomcp?style=flat-square&color=1d3bff&label=jsr"></a>
  <a href="https://github.com/picomcp/picomcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/picomcp/picomcp/ci.yml?branch=main&style=flat-square&label=ci"></a>
  <img alt="gzip size" src="https://img.shields.io/badge/gzip-3.9%20kB-1d3bff?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-1d3bff?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0f1f?style=flat-square"></a>
</p>

<p><a href="README.md">English</a> · <a href="README.fr.md"><b>Français</b></a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.es.md">Español</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a></p>

**picomcp** est un framework TypeScript sans dépendance pour les serveurs [Model Context Protocol](https://modelcontextprotocol.io). Donnez de vrais outils à n’importe quel LLM, en un seul fichier : typé par votre bibliothèque de schémas, servi en stdio ou en HTTP, sur Node, Bun, Deno et l’edge.

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

C’est un serveur complet. **[Lire la doc →](https://picomcp.github.io/picomcp/fr/docs/)**

## Pourquoi picomcp

|  |  |
| --- | --- |
| **3,9 kB gzippé, 0 dépendance** | Assez petit pour être lu d’une traite et audité en une revue. Un budget de taille dans la CI le garantit. |
| **Typé par votre schéma** | Zod 4, ArkType et Valibot via [Standard Schema](https://standardschema.dev). Handlers typés, JSON Schema généré, erreurs de validation lisibles sur lesquelles le modèle peut agir. |
| **Tourne partout** | Node 22+, Bun, Deno, Cloudflare Workers. Le cœur n’utilise que des API Web : aucun module intégré de Node. |
| **stdio et Streamable HTTP** | Le même serveur, à une option près. Plus un handler `fetch` standard pour Hono, Next.js, Workers et les autres. |
| **Testable sans client** | `server.call("forecast", { city: "Lyon" })` exécute un outil dans le processus, avec noms et arguments vérifiés au typage. |
| **Vérifié avec le SDK officiel** | La suite de tests pilote picomcp avec `@modelcontextprotocol/sdk` sur les deux transports. |

## Installation

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

Ou générez un projet avec un serveur, un point d’entrée et un test :

```sh
npx picomcp init my-server
```

## Le tour en cinq extraits

Les **outils** sont des fonctions que le modèle appelle. Renvoyez une chaîne, un objet, un média, ou levez une erreur :

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

La **sortie structurée** est validée et envoyée en `structuredContent` :

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

Les **ressources** utilisent des templates d’URI dont les variables sont typées à partir de la chaîne :

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

Les **prompts** deviennent des commandes slash dans les clients :

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

Les **transports** tiennent chacun en une ligne :

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## Connecter un client

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Les configurations pour Claude Desktop, Cursor et VS Code sont dans [Connecter un client](https://picomcp.github.io/picomcp/fr/docs/clients).

## Le tester

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## Une doc pour les humains et pour les agents

La [documentation](https://picomcp.github.io/picomcp/fr/docs/) propose une recherche qui tolère les fautes de frappe sur <kbd>⌘</kbd> <kbd>K</kbd>, en 8 langues, et chaque page est aussi publiée pour les agents IA :

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt) : l’index de toutes les pages
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt) : toute la documentation dans un seul fichier
- `docs/<page>.md` : n’importe quelle page en Markdown
- [`picomcp-docs`](packages/docs) : la doc sous forme de serveur MCP, construit avec picomcp. `claude mcp add picomcp-docs -- npx -y picomcp-docs`

## Périmètre

picomcp est la moitié serveur de MCP, conçue pour le modèle requête/réponse sans état dont ont besoin la plupart des serveurs. Il couvre le cycle de vie, les outils (avec sortie structurée et annotations), les ressources et leurs templates, les prompts, l’annulation et les deux transports.

Il ne prend pas encore en charge les fonctionnalités où le serveur doit écrire au client de lui-même : sampling, elicitation, roots, notifications de log et de progression, abonnements. Si vous en avez besoin dès aujourd’hui, utilisez le SDK officiel [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk). La liste complète est dans [Couverture du protocole](https://picomcp.github.io/picomcp/fr/docs/protocol).

## Contribuer

Les issues et les pull requests sont les bienvenues. Lisez d’abord [CONTRIBUTING.md](CONTRIBUTING.md), puis :

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

Vous travaillez avec un agent de code ? Il trouvera ses instructions dans [AGENTS.md](AGENTS.md).

## Licence

[MIT](LICENSE)
