<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — servidores MCP a escala pico." src=".github/assets/banner-light.svg" width="100%">
</picture>

<p>
  <a href="https://www.npmjs.com/package/picomcp"><img alt="npm" src="https://img.shields.io/npm/v/picomcp?style=flat-square&color=1d3bff&label=npm"></a>
  <a href="https://jsr.io/@picomcp/picomcp"><img alt="JSR" src="https://img.shields.io/jsr/v/@picomcp/picomcp?style=flat-square&color=1d3bff&label=jsr"></a>
  <a href="https://github.com/picomcp/picomcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/picomcp/picomcp/ci.yml?branch=main&style=flat-square&label=ci"></a>
  <img alt="gzip size" src="https://img.shields.io/badge/gzip-3.9%20kB-1d3bff?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-1d3bff?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0f1f?style=flat-square"></a>
</p>

<p><a href="README.md">English</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.es.md"><b>Español</b></a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a></p>

**picomcp** es un framework de TypeScript sin dependencias para servidores [Model Context Protocol](https://modelcontextprotocol.io). Dale herramientas reales a cualquier LLM en un solo archivo: tipado con tu librería de esquemas, servido por stdio o HTTP, en Node, Bun, Deno y el edge.

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

Eso es un servidor completo. **[Leer la documentación →](https://picomcp.github.io/picomcp/es/docs/)**

## Por qué picomcp

|  |  |
| --- | --- |
| **3,9 kB con gzip, 0 dependencias** | Tan pequeño que se lee de una sentada y se audita en una sola revisión. Un presupuesto de tamaño en la CI lo mantiene así. |
| **Tipado desde tu esquema** | Zod 4, ArkType y Valibot mediante [Standard Schema](https://standardschema.dev). Handlers tipados, JSON Schema generado y errores de validación legibles con los que el modelo puede actuar. |
| **Funciona en todas partes** | Node 22+, Bun, Deno, Cloudflare Workers. El núcleo solo usa API web: ningún módulo integrado de Node. |
| **stdio y Streamable HTTP** | El mismo servidor, a una opción de distancia. Además, un handler `fetch` estándar para Hono, Next.js, Workers y compañía. |
| **Se prueba sin cliente** | `server.call("forecast", { city: "Lyon" })` ejecuta una herramienta en el mismo proceso, con nombres y argumentos comprobados por los tipos. |
| **Verificado con el SDK oficial** | La suite de tests controla picomcp con `@modelcontextprotocol/sdk` en ambos transportes. |

## Instalación

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

O crea un proyecto con un servidor, un punto de entrada y un test:

```sh
npx picomcp init my-server
```

## Un recorrido en cinco fragmentos

Las **herramientas** son funciones que llama el modelo. Devuelve una cadena, un objeto, medios o lanza un error:

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

La **salida estructurada** se valida y se envía como `structuredContent`:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

Los **recursos** usan plantillas de URI cuyas variables se tipan a partir de la cadena:

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

Los **prompts** se convierten en comandos con barra en los clientes:

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

Los **transportes** ocupan una línea cada uno:

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## Conectar un cliente

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Las configuraciones de Claude Desktop, Cursor y VS Code están en [Conectar un cliente](https://picomcp.github.io/picomcp/es/docs/clients).

## Probarlo

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## Documentación para personas y agentes

La [documentación](https://picomcp.github.io/picomcp/es/docs/) tiene una búsqueda que tolera erratas en <kbd>⌘</kbd> <kbd>K</kbd>, está disponible en 8 idiomas, y cada página se publica también para agentes de IA:

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt): un índice de todas las páginas
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt): toda la documentación en un solo archivo
- `docs/<page>.md`: cualquier página en Markdown
- [`picomcp-docs`](packages/docs): la documentación como servidor MCP, construido con picomcp. `claude mcp add picomcp-docs -- npx -y picomcp-docs`

## Alcance

picomcp es la mitad servidor de MCP, pensada para el modelo de petición y respuesta sin estado que necesitan la mayoría de los servidores. Cubre el ciclo de vida, las herramientas (con salida estructurada y anotaciones), los recursos y sus plantillas, los prompts, la cancelación y ambos transportes.

Todavía no soporta las funciones en las que el servidor tiene que escribir al cliente por su cuenta: sampling, elicitation, roots, notificaciones de log y de progreso, suscripciones. Si las necesitas hoy, usa el SDK oficial [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk). La lista completa está en [Cobertura del protocolo](https://picomcp.github.io/picomcp/es/docs/protocol).

## Contribuir

Las issues y las pull requests son bienvenidas. Lee primero [CONTRIBUTING.md](CONTRIBUTING.md) y después:

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

¿Trabajas con un agente de código? Encontrará sus instrucciones en [AGENTS.md](AGENTS.md).

## Licencia

[MIT](LICENSE)
