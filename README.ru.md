<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — MCP-серверы в масштабе пико." src=".github/assets/banner-light.svg" width="100%">
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

<p><a href="README.md">English</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.es.md">Español</a> · <a href="README.ru.md"><b>Русский</b></a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a></p>

**picomcp** — TypeScript-фреймворк без зависимостей для серверов [Model Context Protocol](https://modelcontextprotocol.io). Дайте любой LLM настоящие инструменты в одном файле: типы из вашей библиотеки схем, транспорт stdio или HTTP, работает на Node, Bun, Deno и на edge.

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

Это полноценный сервер. **[Читать документацию →](https://picomcp.github.io/picomcp/ru/docs/)**

## Почему picomcp

|  |  |
| --- | --- |
| **3,9 кБ после gzip, 0 зависимостей** | Достаточно мал, чтобы прочитать за один присест и проверить за одно ревью. Бюджет размера в CI следит, чтобы так и оставалось. |
| **Типы из вашей схемы** | Zod 4, ArkType и Valibot через [Standard Schema](https://standardschema.dev). Типизированные обработчики, сгенерированная JSON Schema и понятные ошибки валидации, с которыми модель может работать. |
| **Работает везде** | Node 22+, Bun, Deno, Cloudflare Workers. Ядро использует только веб-API, без встроенных модулей Node. |
| **stdio и Streamable HTTP** | Один и тот же сервер, разница в одной опции. А также стандартный `fetch`-обработчик для Hono, Next.js, Workers и других. |
| **Тестируется без клиента** | `server.call("forecast", { city: "Lyon" })` вызывает инструмент прямо в процессе, с проверкой имён и аргументов на уровне типов. |
| **Проверен официальным SDK** | Тесты управляют picomcp через `@modelcontextprotocol/sdk` на обоих транспортах. |

## Установка

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

Или создайте проект с сервером, точкой входа и тестом:

```sh
npx picomcp init my-server
```

## Обзор в пяти примерах

**Инструменты** — функции, которые вызывает модель. Возвращайте строку, объект, медиа или выбрасывайте ошибку:

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

**Структурированный вывод** проверяется и отправляется как `structuredContent`:

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

**Ресурсы** используют шаблоны URI, типы переменных которых выводятся из строки:

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

**Промпты** становятся slash-командами в клиентах:

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

**Транспорты** — одна строка на каждый:

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## Подключение клиента

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Конфигурации для Claude Desktop, Cursor и VS Code — в разделе [Подключение клиента](https://picomcp.github.io/picomcp/ru/docs/clients).

## Тестирование

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## Документация для людей и агентов

В [документации](https://picomcp.github.io/picomcp/ru/docs/) есть поиск по <kbd>⌘</kbd> <kbd>K</kbd>, который прощает опечатки. Она доступна на 8 языках, а каждая страница опубликована и для ИИ-агентов:

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt): индекс всех страниц
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt): вся документация в одном файле
- `docs/<page>.md`: любая страница в Markdown
- [`picomcp-docs`](packages/docs): документация в виде MCP-сервера, построенного на picomcp. `claude mcp add picomcp-docs -- npx -y picomcp-docs`

## Область применения

picomcp — серверная половина MCP, рассчитанная на модель «запрос — ответ» без состояния, которая нужна большинству серверов. Он покрывает жизненный цикл, инструменты (со структурированным выводом и аннотациями), ресурсы и шаблоны, промпты, отмену и оба транспорта.

Пока не поддерживаются возможности, при которых сервер сам отправляет сообщения клиенту: sampling, elicitation, roots, уведомления о логах и прогрессе, подписки. Если они нужны вам уже сейчас, используйте официальный [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk). Полный список — в разделе [Покрытие протокола](https://picomcp.github.io/picomcp/ru/docs/protocol).

## Участие в разработке

Issues и pull requests приветствуются. Сначала прочитайте [CONTRIBUTING.md](CONTRIBUTING.md), затем:

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

Работаете с агентом для программирования? Он найдёт свои инструкции в [AGENTS.md](AGENTS.md).

## Лицензия

[MIT](LICENSE)
