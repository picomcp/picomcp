<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="picomcp — 皮米级的 MCP 服务器框架。" src=".github/assets/banner-light.svg" width="100%">
</picture>

<p>
  <a href="https://www.npmjs.com/package/picomcp"><img alt="npm" src="https://img.shields.io/npm/v/picomcp?style=flat-square&color=1d3bff&label=npm"></a>
  <a href="https://jsr.io/@picomcp/picomcp"><img alt="JSR" src="https://img.shields.io/jsr/v/@picomcp/picomcp?style=flat-square&color=1d3bff&label=jsr"></a>
  <a href="https://github.com/picomcp/picomcp/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/picomcp/picomcp/ci.yml?branch=main&style=flat-square&label=ci"></a>
  <img alt="gzip size" src="https://img.shields.io/badge/gzip-3.9%20kB-1d3bff?style=flat-square">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-1d3bff?style=flat-square">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0f1f?style=flat-square"></a>
</p>

<p><a href="README.md">English</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.es.md">Español</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh.md"><b>简体中文</b></a> · <a href="README.ja.md">日本語</a></p>

**picomcp** 是一个零依赖的 TypeScript 框架，用于构建 [Model Context Protocol](https://modelcontextprotocol.io) 服务器。一个文件就能让任何 LLM 用上真正的工具：类型来自你的 schema 库，通过 stdio 或 HTTP 提供服务，运行在 Node、Bun、Deno 和边缘环境。

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

这就是一个完整的服务器。**[阅读文档 →](https://picomcp.github.io/picomcp/zh/docs/)**

## 为什么选择 picomcp

|  |  |
| --- | --- |
| **gzip 后 3.9 kB，零依赖** | 小到可以一口气读完，一次评审就能审计完毕。CI 中的体积预算会让它一直保持这样。 |
| **类型来自你的 schema** | 通过 [Standard Schema](https://standardschema.dev) 支持 Zod 4、ArkType 和 Valibot。处理函数自带类型，自动生成 JSON Schema，校验错误清晰易读，模型可以据此行动。 |
| **随处运行** | Node 22+、Bun、Deno、Cloudflare Workers。核心只使用 Web API，不含任何 Node 内置模块。 |
| **stdio 与 Streamable HTTP** | 同一个服务器，只差一个选项。另有符合 Web 标准的 `fetch` 处理函数，适配 Hono、Next.js、Workers 等。 |
| **无需客户端即可测试** | `server.call("forecast", { city: "Lyon" })` 在进程内运行工具，名称和参数都经过类型检查。 |
| **经官方 SDK 验证** | 测试套件通过 `@modelcontextprotocol/sdk` 在两种传输方式上驱动 picomcp。 |

## 安装

```sh
npm i picomcp zod        # or: bun add · pnpm add · deno add npm:picomcp
```

或者生成一个包含服务器、入口文件和测试的项目：

```sh
npx picomcp init my-server
```

## 五段代码快速了解

**工具**是模型调用的函数。返回字符串、对象、媒体，或者抛出错误：

```ts
server.tool("search_issues", {
  description: "Search open issues. Use it before filing a new one.",
  input: z.object({ query: z.string(), limit: z.number().max(50).default(10) }),
  annotations: { readOnlyHint: true },
  run: async ({ query, limit }, { signal }) => searchIssues(query, limit, { signal }),
});
```

**结构化输出**会经过校验，并作为 `structuredContent` 发送：

```ts
server.tool("get_price", {
  input: z.object({ sku: z.string() }),
  output: z.object({ cents: z.number().int(), currency: z.literal("EUR") }),
  run: async ({ sku }) => ({ cents: await priceOf(sku), currency: "EUR" }),
});
```

**资源**使用 URI 模板，变量类型直接从字符串推导：

```ts
server.resource("github://{owner}/{repo}/readme", {
  mimeType: "text/markdown",
  read: ({ owner, repo }) => fetchReadme(owner, repo), // owner: string, repo: string
});
```

**提示词**在客户端中会变成斜杠命令：

```ts
server.prompt("review", {
  args: z.object({ diff: z.string().describe("The diff to review") }),
  run: ({ diff }) => `Review this diff for bugs:\n\n${diff}`,
});
```

**传输方式**各只需一行：

```ts
await server.serve();                        // stdio, for local clients
await server.serve({ http: 3000 });          // Streamable HTTP on Node, Bun or Deno
export default { fetch: server.fetch };      // Cloudflare Workers, Deno Deploy, Bun…
```

## 连接客户端

```sh
claude mcp add weather -- node /absolute/path/server.ts                     # Claude Code, stdio
claude mcp add --transport http weather https://example.com/mcp             # Claude Code, HTTP
npx @modelcontextprotocol/inspector node /absolute/path/server.ts           # MCP Inspector
```

Claude Desktop、Cursor 和 VS Code 的配置见[连接客户端](https://picomcp.github.io/picomcp/zh/docs/clients)。

## 测试

```ts
import { expect, it } from "vitest";
import { server } from "./server.ts";

it("forecasts", async () => {
  const result = await server.call("forecast", { city: "Lyon" });
  expect(result.isError).toBeUndefined();
});
```

## 写给人，也写给智能体的文档

[文档](https://picomcp.github.io/picomcp/zh/docs/)支持 <kbd>⌘</kbd> <kbd>K</kbd> 容错搜索，提供 8 种语言，每个页面也会发布给 AI 智能体使用：

- [`llms.txt`](https://picomcp.github.io/picomcp/llms.txt)：所有页面的索引
- [`llms-full.txt`](https://picomcp.github.io/picomcp/llms-full.txt)：合并为一个文件的完整文档
- `docs/<page>.md`：任意页面的 Markdown 版本
- [`picomcp-docs`](packages/docs)：以 MCP 服务器形式提供的文档，用 picomcp 构建。`claude mcp add picomcp-docs -- npx -y picomcp-docs`

## 适用范围

picomcp 是 MCP 的服务器端，为大多数服务器所需的无状态请求/响应模型而设计。它涵盖生命周期、工具（含结构化输出和标注）、资源与模板、提示词、取消，以及两种传输方式。

它暂不支持需要服务器主动向客户端发送消息的功能：sampling、elicitation、roots、日志和进度通知、订阅。如果你现在就需要这些功能，请使用官方的 [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)。完整列表见[协议覆盖范围](https://picomcp.github.io/picomcp/zh/docs/protocol)。

## 参与贡献

欢迎提交 issue 和 pull request。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，然后：

```sh
git clone https://github.com/picomcp/picomcp && cd picomcp
npm install
npm run check    # typecheck, tests, build, size budget, package lint
```

在用编程智能体？它会在 [AGENTS.md](AGENTS.md) 中找到自己的说明。

## 许可证

[MIT](LICENSE)
